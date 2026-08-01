import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, normalize, relative, resolve, sep } from "node:path";
import { digestWithout } from "./canonical.js";
import type { ControllerArtifactManifest } from "./contracts.js";

export interface ControllerArtifactBuildInput { entrypoint: string; packageName: string; controllerId: string; controllerVersion: string; }
const sha256Bytes = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const staticImport = /(?:^|[;\n])\s*(?:import(?:\s*(?:type\s*)?(?:[\w$*{},\s]*?\bfrom)?)?|export(?:\s*(?:type\s*)?(?:[\w$*{},\s]*?\bfrom)?)?)\s*["']([^"']+)["']/gm;

export function validateControllerArtifactManifest(value: unknown): ControllerArtifactManifest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError("artifact manifest must be an object");
  const record = value as Record<string, unknown>; const keys = ["schemaVersion", "packageName", "controllerId", "controllerVersion", "entrypoint", "files", "artifactDigest"];
  for (const key of Object.keys(record)) if (!keys.includes(key)) throw new TypeError(`artifact manifest has unknown field ${key}`);
  if (record.schemaVersion !== "gameplay-controller-artifact.v1" || !["packageName", "controllerId", "controllerVersion", "entrypoint", "artifactDigest"].every((key) => typeof record[key] === "string" && (record[key] as string).length > 0) || !Array.isArray(record.files)) throw new TypeError("invalid artifact manifest fields");
  if (!/^[a-f0-9]{64}$/.test(record.artifactDigest as string) || !String(record.entrypoint).endsWith(".js") || String(record.entrypoint).includes("/") || String(record.entrypoint).includes("\\")) throw new TypeError("invalid artifact manifest digest or entrypoint");
  const files = record.files.map((file) => { if (typeof file !== "object" || file === null || Array.isArray(file)) throw new TypeError("invalid artifact file"); const item = file as Record<string, unknown>; if (Object.keys(item).length !== 2 || typeof item.path !== "string" || typeof item.sha256 !== "string" || !item.path.endsWith(".js") || item.path.startsWith("/") || item.path.includes("..") || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new TypeError("invalid artifact file"); return { path: item.path, sha256: item.sha256 }; });
  if (files.length === 0 || !files.some((file) => file.path === record.entrypoint) || new Set(files.map((file) => file.path)).size !== files.length || files.some((file, index) => index > 0 && files[index - 1].path.localeCompare(file.path) >= 0)) throw new TypeError("artifact files must be a lexical runtime graph containing entrypoint");
  const manifest: ControllerArtifactManifest = { schemaVersion: "gameplay-controller-artifact.v1", packageName: record.packageName as string, controllerId: record.controllerId as string, controllerVersion: record.controllerVersion as string, entrypoint: record.entrypoint as string, files, artifactDigest: record.artifactDigest as string };
  if (digestWithout(manifest, ["artifactDigest"]) !== manifest.artifactDigest) throw new TypeError("artifact manifest digest mismatch"); return manifest;
}

function ensureRuntimePath(path: string, label: string): void {
  if (!path.endsWith(".js") || path.endsWith(".d.ts") || path.endsWith(".map") || path.includes("\\0") || path.includes("\\\\") || path.startsWith("/")) throw new TypeError(`${label} must be a package-relative runtime JavaScript path`);
}

export async function buildControllerArtifactManifest(input: ControllerArtifactBuildInput): Promise<ControllerArtifactManifest> {
  if (!input.packageName || !input.controllerId || !input.controllerVersion) throw new TypeError("artifact metadata is required");
  const entrypoint = resolve(input.entrypoint); if (!entrypoint.endsWith(".js") || entrypoint.endsWith(".d.ts") || entrypoint.endsWith(".map")) throw new TypeError("entrypoint must be compiled runtime JavaScript");
  const root = dirname(entrypoint); const entries = new Map<string, string>(); const visiting = new Set<string>();
  async function visit(absolutePath: string): Promise<void> {
    const resolved = resolve(absolutePath); const path = relative(root, resolved); ensureRuntimePath(path, "import"); if (path.startsWith(`..${sep}`) || path === "..") throw new TypeError("runtime import escapes entrypoint directory"); if (entries.has(path)) return; if (visiting.has(path)) return; visiting.add(path);
    const details = await stat(resolved); if (!details.isFile()) throw new TypeError("runtime import must be a file"); const source = await readFile(resolved); const text = source.toString("utf8");
    if (/\b(?:import\s*\(|require\s*\(|process\.env\b|import\.meta\.env\b)/.test(text)) throw new TypeError("dynamic, require, or environment access is forbidden in controller artifact");
    entries.set(path.split(sep).join("/"), sha256Bytes(source)); let match: RegExpExecArray | null; staticImport.lastIndex = 0;
    while ((match = staticImport.exec(text)) !== null) { const specifier = match[1]; if (!specifier.startsWith("./")) throw new TypeError("external and escaping imports are forbidden in controller artifact"); const target = resolve(dirname(resolved), specifier); if (extname(target) !== ".js" || basename(target).endsWith(".d.ts") || target.endsWith(".map")) throw new TypeError("only runtime JavaScript imports are allowed"); await visit(target); }
    visiting.delete(path);
  }
  await visit(entrypoint);
  const files = [...entries].sort(([left], [right]) => left.localeCompare(right)).map(([path, sha256]) => ({ path, sha256 })); const unsigned = { schemaVersion: "gameplay-controller-artifact.v1" as const, packageName: input.packageName, controllerId: input.controllerId, controllerVersion: input.controllerVersion, entrypoint: basename(entrypoint), files };
  return { ...unsigned, artifactDigest: digestWithout({ ...unsigned, artifactDigest: "" }, ["artifactDigest"]) };
}
