import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalJson,
  createAttributedGameEventDraft,
  digestWithout,
  DRIVE555_V0_MANIFEST,
  finalizeGameEvents,
  mapControlIntent,
  sha256Canonical,
  validateAppliedDecisionCorrelation,
  validateControlIntent,
  validateDirective,
  validateGameEvent,
  validateManifest,
  validateObservation,
  validateProgressVerdict,
  validateDrive555RecoveryPolicy,
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
    const base: import("./contracts.js").GameControlIntent = { gameRunId: "run-1", leaseId: "lease-1", fence: 7, directiveId: "directive-1", decisionId: "decision-1", observationSequence: 9, decidedAtAgentMonotonicMs: 1, maximumAgeMs: 250, agentClockDomainId: "agent", reasonCode: "pursue_objective", commands: [{ kind: "analog", controlId: "steer", value: 0.5 }], semanticIntentDigest: "" };
    const intent = { ...base, semanticIntentDigest: digestWithout(base, ["semanticIntentDigest"]) };
    assert.deepEqual(validateControlIntent(intent, manifest).commands, base.commands);
    assert.deepEqual(mapControlIntent(intent, manifest).commands, [
      { kind: "analog", controlId: "accelerate", value: 0 }, { kind: "analog", controlId: "brake", value: 0 }, { kind: "analog", controlId: "steer", value: 0.5 },
    ]);
    assert.equal(mapControlIntent(intent, manifest).maximumHoldMs, 250);
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
    assert.deepEqual(validateDirective(directive, (value) => policy, validateDrive555RecoveryPolicy), directive);
    assert.throws(() => validateDirective({ ...directive, recoveryPolicy: undefined }, (value) => policy, validateDrive555RecoveryPolicy));
    const arbitraryRecovery = { schemaVersion: "555drive.recovery.v1", any: "thing" };
    const arbitraryPolicyDigest = sha256Canonical({ policySnapshot: policy, policySchemaVersion: "racing.v1", recoveryPolicy: arbitraryRecovery, recoveryPolicySchemaVersion: "555drive.recovery.v1" });
    const arbitrary = { ...directive, recoveryPolicy: arbitraryRecovery, gameplayPolicyDigest: arbitraryPolicyDigest };
    assert.throws(() => validateDirective({ ...arbitrary, directiveDigest: digestWithout(arbitrary, ["directiveDigest"]) }, (value) => policy, validateDrive555RecoveryPolicy));
    assert.throws(() => validateDirective({ ...directive, directiveDigest: "0".repeat(64) }, (value) => policy, validateDrive555RecoveryPolicy));
  });

  it("catches incomplete intent envelopes even when their digest and commands are valid", () => {
    const base = { gameRunId: "run-1", leaseId: "lease-1", fence: 7, directiveId: "directive-1", decisionId: "decision-1", observationSequence: 9, decidedAtAgentMonotonicMs: 1, maximumAgeMs: 250, agentClockDomainId: "agent", reasonCode: "pursue_objective", commands: [], semanticIntentDigest: "" };
    const valid = { ...base, semanticIntentDigest: digestWithout(base, ["semanticIntentDigest"]) };
    assert.deepEqual(validateControlIntent(valid, manifest), valid);
    for (const field of ["gameRunId", "leaseId", "fence", "directiveId", "decisionId", "observationSequence", "agentClockDomainId", "reasonCode"] as const) {
      const incomplete = { ...valid }; delete (incomplete as Record<string, unknown>)[field];
      assert.throws(() => validateControlIntent(incomplete, manifest));
    }
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
    for (const authored of [{ type: "collision", payload: {}, eventIndex: 4 }, { type: "collision", payload: {}, sourceId: "forged" }, { type: "collision", payload: {}, occurredAtAuthorityMs: 1 }, { type: "collision", payload: {}, eventId: "x" }, { type: "collision", payload: {}, eventDigest: "x" }]) assert.throws(() => finalizeGameEvents(observation, "555drive.events.v1", [authored]));
  });

  it("catches source-authority and digest changes in observations, events, verdicts, and decisions", () => {
    const appliedControls = { accelerate: 1, brake: 0, steer: 0 };
    const correlation = { leaseId: "lease-1", fence: 7, ownerType: "agent" as const, directiveId: "directive-1", decisionId: "decision-1", semanticIntentDigest: "d".repeat(64), mappedControlsDigest: "e".repeat(64), appliedControlsDigest: sha256Canonical(appliedControls) };
    assert.deepEqual(validateAppliedDecisionCorrelation(correlation), correlation);
    const observed = { ...observation, appliedControls, appliedDecision: correlation };
    assert.deepEqual(validateObservation(observed), observed);
    const event = finalizeGameEvents(observed, "555drive.events.v1", [{ type: "collision", payload: { z: 1 } }])[0];
    assert.deepEqual(validateGameEvent(event, observed), event);
    const verdictBase = { gameRunId: "run-1", sourceId: "source-1", fence: 7, controlOwnerType: "agent" as const, evidenceWindowContextDigest: "b".repeat(64), progressSchemaVersion: "555drive.progress.v1", fromSourceObservationSequence: 8, toSourceObservationSequence: 9, fromSourceObservationDigest: "1".repeat(64), toSourceObservationDigest: "c".repeat(64), evaluatedAtAuthorityMs: 1000, progressed: true, metrics: { distance: 1 }, contributingDecisionIds: ["decision-1"] };
    const verdictId = sha256Canonical({ gameRunId: verdictBase.gameRunId, sourceId: verdictBase.sourceId, fence: verdictBase.fence, controlOwnerType: verdictBase.controlOwnerType, evidenceWindowContextDigest: verdictBase.evidenceWindowContextDigest, progressSchemaVersion: verdictBase.progressSchemaVersion, fromSourceObservationSequence: verdictBase.fromSourceObservationSequence, toSourceObservationSequence: verdictBase.toSourceObservationSequence, fromSourceObservationDigest: verdictBase.fromSourceObservationDigest, toSourceObservationDigest: verdictBase.toSourceObservationDigest });
    const verdict = { ...verdictBase, verdictId, verdictDigest: sha256Canonical({ ...verdictBase, verdictId }) };
    const previous = { ...observed, sequence: 8, sourceObservationSequence: 8, sourceObservationDigest: "1".repeat(64), observedAtAuthorityMs: 900 };
    assert.deepEqual(validateProgressVerdict(verdict, previous, observed), verdict);
    for (const changed of [{ ...observed, sourceId: "source-2" }, { ...observed, fence: 8 }, { ...observed, controlOwnerType: null }, { ...observed, sourceObservationSequence: 10, sequence: 10 }, { ...observed, sourceObservationDigest: "0".repeat(64) }, { ...observed, observedAtAuthorityMs: 1001 }]) assert.throws(() => validateObservation(changed, observed));
    assert.throws(() => validateObservation({ ...observed, appliedDecision: { ...correlation, ownerType: "certification_harness" } }));
    assert.throws(() => validateGameEvent({ ...event, sourceId: "source-2" }, observed));
    assert.throws(() => validateGameEvent({ ...event, extra: true }, observed));
    assert.throws(() => validateProgressVerdict({ ...verdict, toSourceObservationSequence: 10 }, previous, observed));
    assert.throws(() => validateProgressVerdict({ ...verdict, extra: true }, previous, observed));
    const reattributedEvent = { ...event, sourceId: "source-2" }; const reattributedEventStable = { gameRunId: reattributedEvent.gameRunId, sourceId: reattributedEvent.sourceId, fence: reattributedEvent.fence, controlOwnerType: reattributedEvent.controlOwnerType, evidenceWindowContextDigest: reattributedEvent.evidenceWindowContextDigest, eventSchemaVersion: reattributedEvent.eventSchemaVersion, type: reattributedEvent.type, sourceObservationSequence: reattributedEvent.sourceObservationSequence, sourceObservationDigest: reattributedEvent.sourceObservationDigest, eventIndex: reattributedEvent.eventIndex }; reattributedEvent.eventId = sha256Canonical(reattributedEventStable); reattributedEvent.eventDigest = sha256Canonical({ ...reattributedEventStable, eventId: reattributedEvent.eventId, occurredAtAuthorityMs: reattributedEvent.occurredAtAuthorityMs, payload: reattributedEvent.payload });
    assert.throws(() => validateGameEvent(reattributedEvent, observed));
    const reattributedVerdict = { ...verdict, sourceId: "source-2" }; const reattributedVerdictStable = { gameRunId: reattributedVerdict.gameRunId, sourceId: reattributedVerdict.sourceId, fence: reattributedVerdict.fence, controlOwnerType: reattributedVerdict.controlOwnerType, evidenceWindowContextDigest: reattributedVerdict.evidenceWindowContextDigest, progressSchemaVersion: reattributedVerdict.progressSchemaVersion, fromSourceObservationSequence: reattributedVerdict.fromSourceObservationSequence, toSourceObservationSequence: reattributedVerdict.toSourceObservationSequence, fromSourceObservationDigest: reattributedVerdict.fromSourceObservationDigest, toSourceObservationDigest: reattributedVerdict.toSourceObservationDigest }; reattributedVerdict.verdictId = sha256Canonical(reattributedVerdictStable); const unsignedVerdict = { ...reattributedVerdict }; delete (unsignedVerdict as Partial<typeof reattributedVerdict>).verdictDigest; reattributedVerdict.verdictDigest = sha256Canonical(unsignedVerdict);
    assert.throws(() => validateProgressVerdict(reattributedVerdict, previous, observed));
  });

  it("rejects unknown and malformed observation structures", () => {
    for (const malformed of [
      { ...observation, unknown: true }, { ...observation, lifecycle: "racing" }, { ...observation, gameState: undefined },
      { ...observation, player: { speed: Infinity } }, { ...observation, progression: { checkpoint: "one" } },
      { ...observation, entities: [{ id: "e", kind: "hazard", extra: true }] }, { ...observation, appliedControls: { steer: Infinity } },
    ]) assert.throws(() => validateObservation(malformed));
    const controls = { steer: 1 }; const mismatch = { ...observation, appliedControls: controls, appliedDecision: { leaseId: "l", fence: 7, ownerType: "agent", directiveId: "d", decisionId: "x", semanticIntentDigest: "1".repeat(64), mappedControlsDigest: "2".repeat(64), appliedControlsDigest: "3".repeat(64) } };
    assert.throws(() => validateObservation(mismatch));
  });

  it("binds progress verdicts to one ordered authority window and verified contributing decisions", () => {
    const controls = { accelerate: 1, brake: 0, steer: 0 };
    const decision = (decisionId: string) => ({ leaseId: "lease-1", fence: 7, ownerType: "agent" as const, directiveId: "directive-1", decisionId, semanticIntentDigest: "1".repeat(64), mappedControlsDigest: "2".repeat(64), appliedControlsDigest: sha256Canonical(controls) });
    const previous = { ...observation, sequence: 10, sourceObservationSequence: 10, sourceObservationDigest: "3".repeat(64), observedAtAuthorityMs: 1000, appliedControls: controls, appliedDecision: decision("decision-1") };
    const middle = { ...observation, sequence: 11, sourceObservationSequence: 11, sourceObservationDigest: "4".repeat(64), observedAtAuthorityMs: 1100, appliedControls: controls, appliedDecision: decision("decision-2") };
    const current = { ...observation, sequence: 12, sourceObservationSequence: 12, sourceObservationDigest: "5".repeat(64), observedAtAuthorityMs: 1200, appliedControls: controls, appliedDecision: decision("decision-2") };
    const base = { gameRunId: current.gameRunId, sourceId: current.sourceId, fence: current.fence, controlOwnerType: current.controlOwnerType, evidenceWindowContextDigest: current.evidenceWindowContextDigest, progressSchemaVersion: "555drive.progress.v1", fromSourceObservationSequence: previous.sourceObservationSequence, toSourceObservationSequence: current.sourceObservationSequence, fromSourceObservationDigest: previous.sourceObservationDigest, toSourceObservationDigest: current.sourceObservationDigest, evaluatedAtAuthorityMs: current.observedAtAuthorityMs, progressed: true, metrics: { distance: 100 }, contributingDecisionIds: ["decision-1", "decision-2"] };
    const stable = { gameRunId: base.gameRunId, sourceId: base.sourceId, fence: base.fence, controlOwnerType: base.controlOwnerType, evidenceWindowContextDigest: base.evidenceWindowContextDigest, progressSchemaVersion: base.progressSchemaVersion, fromSourceObservationSequence: base.fromSourceObservationSequence, toSourceObservationSequence: base.toSourceObservationSequence, fromSourceObservationDigest: base.fromSourceObservationDigest, toSourceObservationDigest: base.toSourceObservationDigest };
    const unsigned = { ...base, verdictId: sha256Canonical(stable) }; const verdict = { ...unsigned, verdictDigest: sha256Canonical(unsigned) };
    assert.deepEqual(validateProgressVerdict(verdict, previous, current, [previous, middle, current]), verdict);
    for (const invalidPrevious of [{ ...previous, gameRunId: "other-run" }, { ...previous, sourceId: "other-source" }, { ...previous, fence: 8 }, { ...previous, sequence: 13, sourceObservationSequence: 13 }, { ...previous, observedAtAuthorityMs: 1300 }]) assert.throws(() => validateProgressVerdict(verdict, invalidPrevious, current, [invalidPrevious, middle, current]));
    const inventedUnsigned = { ...unsigned, contributingDecisionIds: ["invented-decision"] }; const invented = { ...inventedUnsigned, verdictDigest: sha256Canonical(inventedUnsigned) };
    assert.throws(() => validateProgressVerdict(invented, previous, current, [previous, middle, current]));
  });
});
