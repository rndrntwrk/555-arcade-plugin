import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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

test("build script follows compact named and namespace imports", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gameplay-artifact-script-compact-"));
  const entrypoint = join(directory, "controller.js");
  const output = join(directory, "manifest.json");
  await writeFile(entrypoint, 'import{a}from"./a.js";import*as b from"./b.js";');
  await writeFile(join(directory, "a.js"), "export const a = 1;");
  await writeFile(join(directory, "b.js"), "export const b = 1;");
  const result = Bun.spawnSync(["node", resolve("scripts/build-gameplay-controller-artifact.mjs"), "--entrypoint", entrypoint, "--package-name", "@scope/core", "--controller-id", "test", "--controller-version", "1.0.0", "--output", output]);
  assert.equal(result.exitCode, 0, Buffer.from(result.stderr).toString());
  assert.deepEqual(JSON.parse(await Bun.file(output).text()).files.map((file) => file.path), ["a.js", "b.js", "controller.js"]);
});

test("normal clean build replaces stale output with one stable package-loadable racing-line artifact", async () => {
  const artifact = resolve("dist/gameplay-core/controller-artifacts.json");
  await writeFile(artifact, "stale");
  let result = Bun.spawnSync(["bun", "run", "build"]);
  assert.equal(result.exitCode, 0, Buffer.from(result.stderr).toString());
  const first = await readFile(artifact, "utf8"); const manifest = JSON.parse(first);
  assert.notEqual(first, "stale");
  assert.deepEqual(manifest.files.map((file) => file.path), ["racing-line.js"]);
  assert.equal(manifest.controllerId, "racing_line"); assert.equal(manifest.controllerVersion, "1.0.0");
  const gameplay = await import("@rndrntwrk/plugin-555arcade/gameplay-core");
  assert.equal(typeof gameplay.drive555Adapter.normalizeObservation, "function");
  assert.equal(typeof gameplay.drive555EventWindowDetector.accept, "function");
  assert.equal(typeof gameplay.racingLineController.decide, "function");
  assert.equal(gameplay.DRIVE555_RACING_LINE_POLICY_DEFAULTS.recenterBias, 0.8);
  assert.equal(gameplay.DRIVE555_RECOVERY_POLICY_DEFAULTS.stallWindowMs, 4000);
  result = Bun.spawnSync(["bun", "run", "build"]);
  assert.equal(result.exitCode, 0, Buffer.from(result.stderr).toString());
  assert.equal(await readFile(artifact, "utf8"), first);
});

test("post-build public gameplay-core fixture type-checks adapter/controller types through the package subpath", () => {
  const fixture = resolve("scripts/fixtures/gameplay-core-public-api.fixture.ts");
  const result = Bun.spawnSync(["./node_modules/.bin/tsc", "--noEmit", "--strict", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--skipLibCheck", fixture]);
  assert.equal(result.exitCode, 0, Buffer.from(result.stderr).toString());
});
