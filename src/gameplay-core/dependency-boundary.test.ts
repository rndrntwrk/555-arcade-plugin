import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";

describe("gameplay-core dependency boundary", () => {
  it("catches framework, plugin, environment, and stream dependencies from its public entrypoint", async () => {
    const seen = new Set<string>();
    const visit = async (path: string): Promise<void> => {
      if (seen.has(path)) return;
      seen.add(path);
      const source = await readFile(path, "utf8");
      assert.doesNotMatch(source, /(?:from\s*|import\s*)["'][^"']*(?:@elizaos\/core|\.\.\/index|milaidy|555stream)["']|process\.env|createArcade555Plugin/);
      const imports = source.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?["'](\.[^"']+)["']/g);
      for (const match of imports) await visit(resolve(dirname(path), match[1].replace(/\.js$/, ".ts")));
    };
    await visit(resolve("src/gameplay-core/index.ts"));
  });

  it("catches impure dependencies in emitted JavaScript and declaration graphs", async () => {
    execFileSync("bun", ["run", "build"], { stdio: "pipe" });
    const seen = new Set<string>();
    const visit = async (path: string, extension: string): Promise<void> => {
      if (seen.has(path)) return;
      seen.add(path);
      const source = await readFile(path, "utf8");
      assert.doesNotMatch(source, /(?:from\s*|import\s*)["'][^"']*(?:@elizaos\/core|\.\.\/index|milaidy|555stream)["']|process\.env|createArcade555Plugin/);
      for (const match of source.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?["'](\.[^"']+)["']/g)) {
        const imported = resolve(dirname(path), match[1].replace(/\.js$/, extension));
        assert.equal(existsSync(imported), true, `missing emitted dependency ${imported}`);
        await visit(imported, extension);
      }
    };
    await visit(resolve("dist/gameplay-core/index.js"), ".js");
    await visit(resolve("dist/gameplay-core/index.d.ts"), ".d.ts");
  });
});
