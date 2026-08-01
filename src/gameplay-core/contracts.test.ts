import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalJson,
  createAttributedGameEventDraft,
  digestWithout,
  DRIVE555_V0_MANIFEST,
  finalizeGameEvents,
  sha256Canonical,
  validateControlIntent,
  validateDirective,
  validateManifest,
} from "./index.js";

const manifest: import("./contracts.js").GameAdapterManifest = {
  gameId: "555drive", adapterVersion: "1.0.0",
  observationSchemaVersion: "555drive.observation.v1", eventSchemaVersion: "555drive.events.v1",
  progressSchemaVersion: "555drive.progress.v1", controlSchemaVersion: "555drive.controls.v1",
  controllerFamilies: ["racing_line"], supportedLifecycleCommands: ["start", "restart"],
  observations: { stateSchemaId: "555drive.state.v1", featureIds: ["lifecycle", "frame", "trackSeed", "player.x", "player.z", "player.velocityX", "player.velocityZ", "checkpoint", "remainingTimeMs", "score", "collisionSequence", "lastCollision", "hazards", "appliedControls", "appliedDecision"], appliedControls: true, minimumHz: 10, maximumGapMs: 300 },
  controls: { descriptors: [
    { id: "accelerate", kind: "analog", minimum: 0, maximum: 1, neutral: 0 },
    { id: "brake", kind: "analog", minimum: 0, maximum: 1, neutral: 0 },
    { id: "steer", kind: "analog", minimum: -1, maximum: 1, neutral: 0 },
  ], commandSemantics: "complete_snapshot", maximumIntentAgeMs: 250, maximumHoldMs: 300, maximumSilenceMs: 500 },
  evidence: { stateProgression: true, visualProgression: true, deterministicReplay: true },
};

const observation = {
  gameRunId: "run-1", sourceId: "source-1", fence: 7, controlOwnerType: "agent" as const,
  runtimeProvenanceDigest: "a".repeat(64), evidenceWindowContextDigest: "b".repeat(64),
  observationSchemaVersion: "555drive.observation.v1", sequence: 9, sourceObservationSequence: 9,
  sourceObservationDigest: "c".repeat(64), observedAtAuthorityMs: 1000, lifecycle: "playing" as const,
  gameState: { speed: 10 },
};

describe("gameplay core canonical contracts", () => {
  it("catches canonicalization changes by sorting keys while preserving arrays and rejecting non-JSON values", () => {
    assert.equal(canonicalJson({ b: [2, 1], a: 1 }), '{"a":1,"b":[2,1]}');
    assert.equal(sha256Canonical({ b: 2, a: 1 }), "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777");
    for (const value of [{ x: undefined }, { x: Infinity }, { x: () => {} }, { x: Symbol("x") }, { x: 1n }]) {
      assert.throws(() => canonicalJson(value));
    }
    const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
    assert.throws(() => canonicalJson(cyclic));
  });

  it("catches digest-field tampering by omitting only the named digest field", () => {
    const value = { a: 1, digest: "ignored" };
    assert.equal(digestWithout(value, ["digest"]), "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862");
    assert.match(digestWithout(value, ["digest"]), /^[a-f0-9]{64}$/);
  });

  it("catches manifest drift, undeclared raw controls, duplicates, and descriptor-order mapping changes", () => {
    assert.deepEqual(validateManifest(DRIVE555_V0_MANIFEST), manifest);
    assert.throws(() => validateManifest({ ...manifest, controls: { ...manifest.controls, descriptors: [...manifest.controls.descriptors, { ...manifest.controls.descriptors[0] }] } }));
    const base = { gameRunId: "run-1", leaseId: "lease-1", fence: 7, directiveId: "directive-1", decisionId: "decision-1", observationSequence: 9, decidedAtAgentMonotonicMs: 1, maximumAgeMs: 250, agentClockDomainId: "agent", reasonCode: "pursue_objective", commands: [{ kind: "analog", controlId: "steer", value: 0.5 }], semanticIntentDigest: "" };
    const intent = { ...base, semanticIntentDigest: digestWithout(base, ["semanticIntentDigest"]) };
    assert.deepEqual(validateControlIntent(intent, manifest).commands, [
      { kind: "analog", controlId: "accelerate", value: 0 }, { kind: "analog", controlId: "brake", value: 0 }, { kind: "analog", controlId: "steer", value: 0.5 },
    ]);
    assert.equal(validateControlIntent(intent, manifest).maximumHoldMs, 250);
    assert.throws(() => validateControlIntent({ ...intent, commands: [{ kind: "analog", controlId: "steer", value: Infinity }] }, manifest));
    assert.throws(() => validateControlIntent({ ...intent, commands: [{ kind: "analog", controlId: "unknown", value: 0 }] }, manifest));
    assert.throws(() => validateControlIntent({ ...intent, commands: [{ kind: "pointer", controlId: "steer", coordinateSpace: "game-normalized", x: 0, y: 0, phase: "move" }] }, manifest));
  });

  it("catches recovery-policy omissions and directive digest mismatches", () => {
    const policy = { schemaVersion: "racing.v1", aggression: 1 };
    const recovery = { schemaVersion: "555drive.recovery.v1", stallWindowMs: 4000, maximumPositionRange: 10, maximumAttempts: 1, action: "restart", progressDeadlineMs: 5000, minimumForwardDelta: 1000 };
    const raw = { gameRunId: "run-1", leaseId: "lease-1", fence: 7, directiveId: "directive-1", goal: "finish", strategyFamily: "racing_line", gameplayPolicyId: "racing_line", gameplayPolicyVersion: 1, policySnapshot: policy, recoveryPolicy: recovery, memoryProvenanceIds: [], issuedAtAgentMonotonicMs: 1, validForMs: 250, agentClockDomainId: "agent", directiveDigest: "", gameplayPolicyDigest: "" };
    const withPolicy = { ...raw, gameplayPolicyDigest: sha256Canonical({ policySnapshot: policy, policySchemaVersion: "racing.v1", recoveryPolicy: recovery, recoveryPolicySchemaVersion: "555drive.recovery.v1" }) };
    const directive = { ...withPolicy, directiveDigest: digestWithout(withPolicy, ["directiveDigest"]) };
    assert.deepEqual(validateDirective(directive, (value) => policy), directive);
    assert.throws(() => validateDirective({ ...directive, recoveryPolicy: undefined }, (value) => policy));
    assert.throws(() => validateDirective({ ...directive, directiveDigest: "0".repeat(64) }, (value) => policy));
  });

  it("catches attribution changes and assigns deterministic event IDs only at finalization", () => {
    assert.deepEqual(createAttributedGameEventDraft("collision", { z: 1 }), { type: "collision", payload: { z: 1 } });
    const events = finalizeGameEvents(observation, "555drive.events.v1", [
      { type: "score.improved", payload: { score: 2 } }, { type: "collision", payload: { z: 1 } }, { type: "collision", payload: { z: 0 } },
    ]);
    assert.deepEqual(events.map((event) => [event.type, event.eventIndex]), [["collision", 0], ["collision", 1], ["score.improved", 2]]);
    assert.equal(events[0].sourceId, "source-1"); assert.equal(events[0].fence, 7); assert.equal(events[0].occurredAtAuthorityMs, 1000);
    assert.match(events[0].eventId, /^[a-f0-9]{64}$/); assert.match(events[0].eventDigest, /^[a-f0-9]{64}$/);
    assert.throws(() => finalizeGameEvents({ ...observation, sourceId: "" }, "555drive.events.v1", [{ type: "x", payload: {} }]));
  });
});
