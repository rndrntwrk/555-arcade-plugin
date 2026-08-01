import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "bun:test";

test("build script writes a canonical artifact manifest from only compiled inputs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gameplay-artifact-script-"));
  const entrypoint = join(directory, "controller.js");
  const output = join(directory, "manifest.json");
  await writeFile(entrypoint, "export const controller = 1;");
  const result = Bun.spawnSync(["node", resolve("scripts/build-gameplay-controller-artifact.mjs"), "--entrypoint", entrypoint, "--package-name", "@scope/core", "--controller-id", "test", "--controller-version", "1.0.0", "--output", output]);
  assert.equal(result.exitCode, 0, Buffer.from(result.stderr).toString());
  const manifest = JSON.parse(await Bun.file(output).text());
  assert.equal(manifest.files[0].path, "controller.js");
  assert.match(manifest.artifactDigest, /^[a-f0-9]{64}$/);
});
