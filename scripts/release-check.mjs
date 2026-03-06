import { existsSync, readFileSync } from "node:fs";

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
