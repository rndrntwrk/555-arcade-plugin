import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

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
