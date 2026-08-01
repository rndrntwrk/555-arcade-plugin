import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";

function canonical(value, stack = new Set()) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new TypeError("non-finite number"); return JSON.stringify(value); }
  if (typeof value !== "object" || value === undefined) throw new TypeError("non-JSON value");
  if (stack.has(value)) throw new TypeError("cycle"); stack.add(value);
  try { if (Array.isArray(value)) return `[${value.map((entry) => canonical(entry, stack)).join(",")}]`; return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key], stack)}`).join(",")}}`; } finally { stack.delete(value); }
}
const hash = (value) => createHash("sha256").update(canonical(value)).digest("hex");
const byteHash = (value) => createHash("sha256").update(value).digest("hex");
const args = Object.fromEntries(process.argv.slice(2).reduce((all, value, index, values) => value.startsWith("--") ? [...all, [value.slice(2), values[index + 1]]] : all, []));
for (const key of ["entrypoint", "package-name", "controller-id", "controller-version", "output"]) if (!args[key]) throw new TypeError(`--${key} is required`);
const entrypoint = resolve(args.entrypoint); if (!entrypoint.endsWith(".js")) throw new TypeError("entrypoint must be compiled JavaScript"); const root = dirname(entrypoint); const files = new Map(); const importPattern = /(?:^|[;\n])\s*(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+)["']([^"']+)["']/gm;
async function visit(file) {
  const path = relative(root, resolve(file)); if (!path || path.startsWith(`..${sep}`) || !path.endsWith(".js")) throw new TypeError("import must be package-relative compiled JavaScript"); if (files.has(path)) return;
  if (!(await stat(file)).isFile()) throw new TypeError("missing runtime import"); const bytes = await readFile(file); const source = bytes.toString("utf8"); if (/\b(?:import\s*\(|require\s*\(|process\.env\b|import\.meta\.env\b)/.test(source)) throw new TypeError("dynamic or environment dependency"); files.set(path.split(sep).join("/"), byteHash(bytes)); importPattern.lastIndex = 0; let match;
  while ((match = importPattern.exec(source))) { if (!match[1].startsWith("./")) throw new TypeError("external import"); const imported = resolve(dirname(file), match[1]); if (extname(imported) !== ".js") throw new TypeError("non-runtime import"); await visit(imported); }
}
await visit(entrypoint);
const manifest = { schemaVersion: "gameplay-controller-artifact.v1", packageName: args["package-name"], controllerId: args["controller-id"], controllerVersion: args["controller-version"], entrypoint: basename(entrypoint), files: [...files].sort(([a], [b]) => a.localeCompare(b)).map(([path, sha256]) => ({ path, sha256 })) }; manifest.artifactDigest = hash(manifest);
await writeFile(resolve(args.output), `${canonical(manifest)}\n`);
