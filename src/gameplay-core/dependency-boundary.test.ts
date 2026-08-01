import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
});
