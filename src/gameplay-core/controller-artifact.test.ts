import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildControllerArtifactManifest, validateControllerArtifactManifest } from "./index.js";

describe("controller artifact graph", () => {
  it("catches changed compiled bytes and excludes non-runtime artifacts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "gameplay-artifact-"));
    await mkdir(join(directory, "nested"));
    await writeFile(join(directory, "entry.js"), 'import "./nested/a.js"; export const controller = 1;');
    await writeFile(join(directory, "nested/a.js"), "export const a = 1;");
    const first = await buildControllerArtifactManifest({ entrypoint: join(directory, "entry.js"), packageName: "@scope/core", controllerId: "test", controllerVersion: "1.0.0" });
    assert.deepEqual(first.files.map((file: { path: string }) => file.path), ["entry.js", "nested/a.js"]);
    assert.match(first.artifactDigest, /^[a-f0-9]{64}$/);
    assert.deepEqual(validateControllerArtifactManifest(first), first);
    assert.throws(() => validateControllerArtifactManifest({ ...first, artifactDigest: "0".repeat(64) }));
    assert.throws(() => validateControllerArtifactManifest({ ...first, files: [] }));
    assert.throws(() => validateControllerArtifactManifest({ ...first, entrypoint: "missing.js" }));
    await writeFile(join(directory, "nested/a.js"), "export const a = 2;");
    const second = await buildControllerArtifactManifest({ entrypoint: join(directory, "entry.js"), packageName: "@scope/core", controllerId: "test", controllerVersion: "1.0.0" });
    assert.notEqual(first.artifactDigest, second.artifactDigest);
  });

  it("catches dynamic, external, escaping, declaration, source-map and environment imports", async () => {
    const directory = await mkdtemp(join(tmpdir(), "gameplay-artifact-invalid-"));
    for (const source of ['import("./a.js")', 'import "external"', 'import "../escape.js"', 'import "./a.d.ts"', 'import "./a.js"; console.log(process.env.X)']) {
      await writeFile(join(directory, "entry.js"), source);
      await assert.rejects(() => buildControllerArtifactManifest({ entrypoint: join(directory, "entry.js"), packageName: "@scope/core", controllerId: "test", controllerVersion: "1.0.0" }));
    }
  });

  it("follows compact named and namespace static imports", async () => {
    const directory = await mkdtemp(join(tmpdir(), "gameplay-artifact-compact-"));
    await writeFile(join(directory, "entry.js"), 'import{a}from"./a.js";import*as b from"./b.js";export{a}from"./c.js";');
    for (const file of ["a.js", "b.js", "c.js"]) await writeFile(join(directory, file), "export const value = 1;");
    const artifact = await buildControllerArtifactManifest({ entrypoint: join(directory, "entry.js"), packageName: "@scope/core", controllerId: "test", controllerVersion: "1.0.0" });
    assert.deepEqual(artifact.files.map((file) => file.path), ["a.js", "b.js", "c.js", "entry.js"]);
  });
});
