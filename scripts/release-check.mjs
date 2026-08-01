import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "CHANGELOG.md",
  "README.md",
  "LICENSE",
  "elizaos.plugin.json",
  "docs/QUICKSTART_3_STEPS.md",
  "docs/PUBLIC_RELEASE_CHECKLIST.md",
  "skills/arcade-operator/SKILL.md",
  "skills/openclaw/SKILL.md",
  ".github/workflows/ci.yml",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`[release-check] missing files: ${missing.join(", ")}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (!pkg.name || !pkg.version) {
  console.error("[release-check] package.json missing name/version");
  process.exit(1);
}
if (pkg.elizaos?.displayName !== "555 Arcade") {
  console.error("[release-check] package.json elizaos.displayName must be '555 Arcade'");
  process.exit(1);
}
if (pkg.homepage !== "https://docs.rndrntwrk.com/arcade/overview") {
  console.error("[release-check] package.json homepage must point to canonical ecosystem docs");
  process.exit(1);
}
if (pkg.publishConfig?.access !== "public") {
  console.error("[release-check] package.json publishConfig.access must be 'public'");
  process.exit(1);
}

const requiredExports = [
  ".",
  "./gameplay-core",
  "./gameplay-core/controller-artifacts.json",
  "./mastery",
  "./intelligence",
  "./types",
  "./milaidy",
  "./openapi",
  "./compat",
  "./lib/transport/action-kit",
  "./lib/transport/agent-auth",
];
const exportedKeys = pkg.exports ? Object.keys(pkg.exports) : [];
const missingExports = requiredExports.filter((entry) => !exportedKeys.includes(entry));
if (missingExports.length > 0) {
  console.error(`[release-check] missing package exports: ${missingExports.join(", ")}`);
  process.exit(1);
}

const gameplayCore = pkg.exports?.["./gameplay-core"];
if (gameplayCore?.import !== "./dist/gameplay-core/index.js" || gameplayCore?.types !== "./dist/gameplay-core/index.d.ts") {
  console.error("[release-check] gameplay-core export must point to compiled JS and declarations");
  process.exit(1);
}
if (pkg.exports?.["./gameplay-core/controller-artifacts.json"]?.default !== "./dist/gameplay-core/controller-artifacts.json") {
  console.error("[release-check] controller artifact export must point to built JSON");
  process.exit(1);
}
for (const file of ["dist/gameplay-core/index.js", "dist/gameplay-core/index.d.ts"]) {
  if (!existsSync(file)) {
    console.error(`[release-check] missing compiled gameplay-core file: ${file}`);
    process.exit(1);
  }
}
const verifyPureGameplayGraph = (entrypoint, extension) => {
  const visited = new Set();
  const visit = (file) => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    if (/(?:from\s*|import\s*\(?\s*)["'][^"']*(?:@elizaos\/core|\.\.\/index|milaidy|555stream)["']|process\.env|createArcade555Plugin/.test(source)) throw new Error(`impure gameplay-core dependency in ${file}`);
    const specifiers = [...source.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?["'](\.[^"']+)["']/g), ...source.matchAll(/import\s*\(\s*["'](\.[^"']+)["']\s*\)/g)];
    for (const match of specifiers) {
      const imported = resolve(dirname(file), match[1].replace(/\.js$/, extension));
      if (!existsSync(imported)) throw new Error(`missing gameplay-core dependency ${imported}`);
      visit(imported);
    }
  };
  visit(entrypoint);
};
try {
  verifyPureGameplayGraph("src/gameplay-core/index.ts", ".ts");
  verifyPureGameplayGraph("dist/gameplay-core/index.js", ".js");
  verifyPureGameplayGraph("dist/gameplay-core/index.d.ts", ".d.ts");
} catch (error) {
  console.error(`[release-check] gameplay-core public graph is not pure: ${(error).message}`);
  process.exit(1);
}
if (pkg.peerDependenciesMeta?.["@elizaos/core"]?.optional !== true) {
  console.error("[release-check] @elizaos/core must be an optional peer for pure gameplay-core consumers");
  process.exit(1);
}

const controllerArtifact = "dist/gameplay-core/controller-artifacts.json";
const rebuiltArtifact = "dist/gameplay-core/.release-check-controller-artifacts.json";
try {
  if (!existsSync(controllerArtifact)) throw new Error("missing controller artifact");
  const rebuild = spawnSync("node", ["scripts/build-gameplay-controller-artifact.mjs", "--entrypoint", "dist/gameplay-core/games/555drive/racing-line.js", "--package-name", "@rndrntwrk/plugin-555arcade", "--controller-id", "racing_line", "--controller-version", "1.0.0", "--output", rebuiltArtifact], { encoding: "utf8" });
  if (rebuild.status !== 0) throw new Error(`controller artifact rebuild failed: ${rebuild.stderr}`);
  if (readFileSync(controllerArtifact, "utf8") !== readFileSync(rebuiltArtifact, "utf8")) throw new Error("controller artifact bytes drift from independent rebuild");
  const artifact = JSON.parse(readFileSync(controllerArtifact, "utf8"));
  if (artifact.schemaVersion !== "gameplay-controller-artifact.v1" || artifact.packageName !== "@rndrntwrk/plugin-555arcade" || artifact.controllerId !== "racing_line" || artifact.controllerVersion !== "1.0.0" || artifact.entrypoint !== "racing-line.js" || !Array.isArray(artifact.files) || artifact.files.length !== 1 || artifact.files[0]?.path !== "racing-line.js" || !/^[a-f0-9]{64}$/.test(artifact.files[0]?.sha256 ?? "") || !/^[a-f0-9]{64}$/.test(artifact.artifactDigest ?? "")) throw new Error("controller artifact is not the one canonical racing-line record");
} catch (error) {
  console.error(`[release-check] controller artifact invalid: ${error.message}`);
  process.exit(1);
} finally {
  rmSync(rebuiltArtifact, { force: true });
}

const manifest = JSON.parse(readFileSync("elizaos.plugin.json", "utf8"));
if (manifest.displayName !== "555 Arcade") {
  console.error("[release-check] elizaos.plugin.json displayName must be '555 Arcade'");
  process.exit(1);
}
if (!manifest.quickstart?.steps?.some((step) => step.includes("ARCADE555_AGENT_API_KEY"))) {
  console.error("[release-check] elizaos.plugin.json quickstart must document ARCADE555_AGENT_API_KEY");
  process.exit(1);
}

console.log("[release-check] ok");
