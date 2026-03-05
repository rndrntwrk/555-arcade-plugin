import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "LICENSE",
  "elizaos.plugin.json",
  "docs/QUICKSTART_3_STEPS.md",
  "skills/arcade-operator/SKILL.md",
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

console.log("[release-check] ok");

