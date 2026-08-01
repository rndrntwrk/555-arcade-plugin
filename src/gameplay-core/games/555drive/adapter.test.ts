import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sha256Canonical } from "../../canonical.js";
import { finalizeGameEvents } from "../../validators.js";
import { drive555Adapter, drive555EventWindowDetector, type Drive555RawState } from "./adapter.js";

const digest = (value: unknown) => sha256Canonical(value);
const controls = { accelerate: 1, brake: 0, steer: 0 };
const correlation = (decisionId = "decision-1") => ({
  leaseId: "lease-1", fence: 7, ownerType: "agent" as const, directiveId: "directive-1", decisionId,
  semanticIntentDigest: "a".repeat(64), mappedControlsDigest: "b".repeat(64), appliedControlsDigest: digest(controls),
});
const state = (changes: Partial<Drive555RawState> = {}): Drive555RawState => ({
  lifecycle: "playing", frame: 1, trackSeed: 1331, player: { x: 4, z: 2000, velocityX: 2, velocityZ: 30 }, checkpoint: 2,
  remainingTimeMs: 90_000, score: 12, collisionSequence: 0, lastCollision: null,
  hazards: [{ id: "track:2:4", relativeX: 3, relativeZ: 80, relativeVelocityZ: -4 }], ...changes,
});
const binding = { gameRunId: "run-1", sourceId: "source-1", sourceCapabilityDigest: "c".repeat(64) } as import("../../contracts.js").BoundGameRunBinding;
const runtime = { bridgeVersion: "native-1", bridgeDigest: "d".repeat(64), runtimeProvenanceDigest: "e".repeat(64) } as import("../../contracts.js").GameplayRuntimeProvenance;
const evidence = { contextDigest: "f".repeat(64), binding, runtime } as import("../../contracts.js").GameplayEvidenceWindowContext;
function rawSample(sequence: number, at = sequence * 100, changes: Partial<Drive555RawState> = {}, decision = correlation()): import("../../contracts.js").RawGameSampleEnvelope<Drive555RawState> {
  const rawState = state(changes); const unsigned = {
    gameRunId: "run-1", sourceId: "source-1", fence: 7, controlOwnerType: "agent" as const, bridgeVersion: "native-1", bridgeDigest: "d".repeat(64), rawSchemaVersion: "555drive.state.v1", relaySequence: 900 + sequence,
    sourceObservationSequence: sequence, observedAtAuthorityMs: at, rawState, rawStateDigest: digest(rawState), appliedControls: controls, appliedControlsDigest: digest(controls), appliedDecision: decision,
  };
  return { ...unsigned, rawEnvelopeDigest: digest(Object.fromEntries(Object.entries(unsigned).filter(([key]) => key !== "relaySequence"))) };
}
const observe = (sequence: number, at = sequence * 100, changes: Partial<Drive555RawState> = {}, decision = correlation()) => drive555Adapter.normalizeObservation(rawSample(sequence, at, changes, decision), binding, runtime, evidence);
function observeWithAppliedControl(sequence: number, at: number, appliedControls: Record<string, number | boolean>, appliedDecision: import("../../contracts.js").AppliedDecisionCorrelation | undefined, owner: "agent" | "certification_harness" = "agent", changes: Partial<Drive555RawState> = {}) {
  const original = rawSample(sequence, at, changes); const unsigned = { ...original, controlOwnerType: owner, appliedControls, appliedControlsDigest: digest(appliedControls), ...(appliedDecision === undefined ? {} : { appliedDecision }) };
  if (appliedDecision === undefined) delete (unsigned as Partial<typeof unsigned>).appliedDecision;
  return drive555Adapter.normalizeObservation({ ...unsigned, rawEnvelopeDigest: digest(Object.fromEntries(Object.entries(unsigned).filter(([key]) => key !== "relaySequence" && key !== "rawEnvelopeDigest"))) }, binding, runtime, evidence);
}

describe("555Drive adapter", () => {
  it("rejects malformed raw samples and binds source authority without relay sequencing", () => {
    assert.deepEqual(drive555Adapter.manifest, {
      gameId: "555drive", adapterVersion: "1.0.0", observationSchemaVersion: "555drive.observation.v1", eventSchemaVersion: "555drive.events.v1", progressSchemaVersion: "555drive.progress.v1", controlSchemaVersion: "555drive.controls.v1", controllerFamilies: ["racing_line"], supportedLifecycleCommands: ["start", "restart"],
      observations: { stateSchemaId: "555drive.state.v1", featureIds: ["lifecycle", "frame", "trackSeed", "player.x", "player.z", "player.velocityX", "player.velocityZ", "checkpoint", "remainingTimeMs", "score", "collisionSequence", "lastCollision", "hazards", "appliedControls", "appliedDecision"], appliedControls: true, minimumHz: 10, maximumGapMs: 300 },
      controls: { descriptors: [{ id: "accelerate", kind: "analog", minimum: 0, maximum: 1, neutral: 0 }, { id: "brake", kind: "analog", minimum: 0, maximum: 1, neutral: 0 }, { id: "steer", kind: "analog", minimum: -1, maximum: 1, neutral: 0 }], commandSemantics: "complete_snapshot", maximumIntentAgeMs: 250, maximumHoldMs: 300, maximumSilenceMs: 500 },
      evidence: { stateProgression: true, visualProgression: true, deterministicReplay: true },
    });
    const raw = rawSample(2);
    const normalized = drive555Adapter.normalizeObservation(raw, binding, runtime, evidence);
    assert.equal(normalized.sequence, 2); assert.equal(normalized.sourceObservationDigest, raw.rawEnvelopeDigest);
    assert.equal(normalized.progression?.distance, 2000); assert.equal(normalized.observedAtAuthorityMs, 200);
    assert.deepEqual(normalized.appliedControls, controls); assert.equal(normalized.appliedDecision?.decisionId, "decision-1");
    for (const broken of [
      { ...raw, rawStateDigest: "0".repeat(64) },
      { ...raw, sourceId: "other" },
      { ...raw, appliedDecision: correlation("decision-2"), rawEnvelopeDigest: raw.rawEnvelopeDigest },
      { ...raw, rawState: { ...raw.rawState, lifecycle: "racing" } },
    ]) assert.throws(() => drive555Adapter.normalizeObservation(broken as unknown as import("../../contracts.js").RawGameSampleEnvelope<Drive555RawState>, binding, runtime, evidence));
    assert.equal(drive555Adapter.normalizeObservation({ ...raw, relaySequence: raw.relaySequence + 1 }, binding, runtime, evidence).sourceObservationDigest, raw.rawEnvelopeDigest);
  });

  it("rejects run/source/fence/owner/runtime/evidence/authority and unsupported raw-value tampering", () => {
    const raw = rawSample(2);
    const ownerMismatch = { ...raw, controlOwnerType: "certification_harness" as const };
    ownerMismatch.rawEnvelopeDigest = digest(Object.fromEntries(Object.entries(ownerMismatch).filter(([key]) => key !== "relaySequence" && key !== "rawEnvelopeDigest")));
    const fenceMismatch = { ...raw, fence: 8 };
    fenceMismatch.rawEnvelopeDigest = digest(Object.fromEntries(Object.entries(fenceMismatch).filter(([key]) => key !== "relaySequence" && key !== "rawEnvelopeDigest")));
    for (const malformed of [
      { ...raw, gameRunId: "other-run" }, { ...raw, sourceId: "other-source" }, fenceMismatch, ownerMismatch,
      { ...raw, bridgeVersion: "other-bridge" }, { ...raw, observedAtAuthorityMs: 200.5 }, { ...raw, rawState: { ...raw.rawState, player: { ...raw.rawState.player, x: Infinity } } },
    ]) assert.throws(() => drive555Adapter.normalizeObservation(malformed as unknown as import("../../contracts.js").RawGameSampleEnvelope<Drive555RawState>, binding, runtime, evidence));
    assert.throws(() => drive555Adapter.normalizeObservation(raw, binding, runtime, { ...evidence, runtime: { ...runtime, runtimeProvenanceDigest: "0".repeat(64) } }));
  });

  it("preserves repeated identical applied controls with distinct valid decision correlations", () => {
    const first = observe(1, 100, {}, correlation("decision-a")); const second = observe(2, 200, {}, correlation("decision-b"));
    assert.deepEqual(first.appliedControls, second.appliedControls); assert.equal(first.appliedDecision?.decisionId, "decision-a"); assert.equal(second.appliedDecision?.decisionId, "decision-b");
  });

  it("maps complete canonical controls and uses the shared finalizer for unattributed drafts", () => {
    const unsignedIntent = { gameRunId: "run-1", leaseId: "lease-1", fence: 7, directiveId: "directive-1", decisionId: "decision-1", observationSequence: 2, decidedAtAgentMonotonicMs: 7, maximumAgeMs: 250, agentClockDomainId: "clock", reasonCode: "pursue_objective" as const, commands: [{ kind: "analog" as const, controlId: "steer", value: .25 }] };
    const signed = { ...unsignedIntent, semanticIntentDigest: digest(unsignedIntent) };
    const mapped = drive555Adapter.mapControl(signed);
    assert.deepEqual(mapped.commands, [{ kind: "analog", controlId: "accelerate", value: 0 }, { kind: "analog", controlId: "brake", value: 0 }, { kind: "analog", controlId: "steer", value: .25 }]);
    assert.equal(mapped.maximumHoldMs, 250); assert.match(mapped.mappedControlsDigest, /^[a-f0-9]{64}$/);
    const duplicate = { ...unsignedIntent, commands: [...unsignedIntent.commands, unsignedIntent.commands[0]] };
    assert.throws(() => drive555Adapter.mapControl({ ...duplicate, semanticIntentDigest: digest(duplicate) }));
    const previous = observe(1, 100, { score: 10, checkpoint: 1 }); const current = observe(2, 200, { score: 15, checkpoint: 2, collisionSequence: 1, lastCollision: { sequence: 1, kind: "vehicle", objectId: "car-7", physicsFrameSequence: 2 } });
    const drafts = drive555Adapter.deriveEventDrafts(previous, current);
    assert.deepEqual(drafts.map((draft) => draft.type).sort(), ["checkpoint.reached", "collision", "score.improved"]);
    assert.ok(drafts.every((draft) => Object.keys(draft).length === 2));
    assert.deepEqual(finalizeGameEvents(current, "555drive.events.v1", drafts).map((event) => event.type), ["checkpoint.reached", "collision", "score.improved"]);
  });

  it("derives only adjacent authoritative transition drafts and z-based progress", () => {
    const previous = observe(1, 100, { score: 10, checkpoint: 1, player: { x: 0, z: 1000, velocityX: 0, velocityZ: 10 } }, correlation("decision-a"));
    const current = observe(2, 200, { score: 10, checkpoint: 1, player: { x: 0, z: 1125, velocityX: 0, velocityZ: 10 } }, correlation("decision-b"));
    const verdict = drive555Adapter.evaluateProgress(previous, current);
    assert.deepEqual(verdict.metrics, { forwardZDelta: 125, scoreDelta: 0, collisionSequenceDelta: 0 });
    assert.equal(verdict.progressed, true); assert.deepEqual(verdict.contributingDecisionIds, ["decision-a", "decision-b"]);
    assert.equal(drive555Adapter.deriveEventDrafts(previous, { ...current, sourceObservationSequence: 4, sequence: 4 }).length, 0);
    assert.equal(drive555Adapter.deriveEventDrafts(previous, { ...current, observedAtAuthorityMs: 500 }).length, 0);
  });

  it("derives exact transition payloads and limits progress to player z rather than timers or score", () => {
    const previous = observe(1, 100, { lifecycle: "playing", score: 10, checkpoint: 1, player: { x: 2, z: 1000, velocityX: 0, velocityZ: 10 } });
    const current = observe(2, 200, { lifecycle: "completed", score: 15, checkpoint: 3, collisionSequence: 1, lastCollision: { sequence: 1, kind: "track_object", objectId: "track:2:4", physicsFrameSequence: 9 }, player: { x: 4, z: 1125, velocityX: 0, velocityZ: 10 } });
    assert.deepEqual(drive555Adapter.deriveEventDrafts(previous, current), [
      { type: "score.improved", payload: { previousScore: 10, currentScore: 15, delta: 5 } },
      { type: "checkpoint.reached", payload: { previousCheckpoint: 1, currentCheckpoint: 3, delta: 2 } },
      { type: "run.completed", payload: { previousLifecycle: "playing", currentLifecycle: "completed", finalScore: 15, finalCheckpoint: 3, finalPosition: { x: 4, z: 1125 } } },
      { type: "collision", payload: { previousCollisionSequence: 0, currentCollisionSequence: 1, delta: 1, collision: { sequence: 1, kind: "track_object", objectId: "track:2:4", physicsFrameSequence: 9 } } },
    ]);
    const flat = observe(2, 200, { score: 99, remainingTimeMs: 1, player: { x: 4, z: 1000, velocityX: 9, velocityZ: 0 } });
    assert.equal(drive555Adapter.evaluateProgress(previous, flat).progressed, false);
  });

  it("emits hazard avoidance only for one stable hazard crossing without its collision", () => {
    const before = observe(1, 100, { hazards: [{ id: "track:5:2", relativeX: 1, relativeZ: 2, relativeVelocityZ: -1 }] });
    const after = observe(2, 200, { hazards: [{ id: "track:5:2", relativeX: 1, relativeZ: -1, relativeVelocityZ: -1 }] });
    assert.deepEqual(drive555Adapter.deriveEventDrafts(before, after), [{ type: "hazard.avoided", payload: { hazardId: "track:5:2" } }]);
    const collided = observe(2, 200, { collisionSequence: 1, lastCollision: { sequence: 1, kind: "track_object", objectId: "track:5:2", physicsFrameSequence: 8 }, hazards: after.gameState.hazards });
    assert.equal(drive555Adapter.deriveEventDrafts(before, collided).some((draft) => draft.type === "hazard.avoided"), false);
  });

  it("rejects arbitrary raw hazard IDs and never credits an unbounded vehicle crossing as avoidance", () => {
    const invalid = rawSample(1, 100, { hazards: [{ id: "vehicle:unbounded", relativeX: 0, relativeZ: 1, relativeVelocityZ: 0 }] });
    assert.throws(() => drive555Adapter.normalizeObservation(invalid, binding, runtime, evidence));
    const before = observe(1, 100, { hazards: [{ id: "track:2:4", relativeX: 0, relativeZ: 1, relativeVelocityZ: 0 }] });
    const after = observe(2, 200, { hazards: [{ id: "track:2:4", relativeX: 0, relativeZ: -1, relativeVelocityZ: 0 }] });
    const forgedBefore = { ...before, gameState: { ...before.gameState, hazards: [{ ...before.gameState.hazards[0], id: "vehicle:unbounded" }] }, entities: [{ ...before.entities![0], id: "vehicle:unbounded" }] };
    const forgedAfter = { ...after, gameState: { ...after.gameState, hazards: [{ ...after.gameState.hazards[0], id: "vehicle:unbounded" }] }, entities: [{ ...after.entities![0], id: "vehicle:unbounded" }] };
    assert.equal(drive555Adapter.deriveEventDrafts(forgedBefore, forgedAfter).some((draft) => draft.type === "hazard.avoided"), false);
  });

  it("detects exactly one attributed stall only after a gap-free four-second reflected forward plateau", () => {
    let window = drive555EventWindowDetector.initialState();
    for (const [sequence, at, z] of [[1, 0, 1000], [2, 250, 1005], [3, 500, 1008], [4, 750, 1010], [5, 1000, 1010], [6, 1250, 1010], [7, 1500, 1010], [8, 1750, 1010], [9, 2000, 1010], [10, 2250, 1010], [11, 2500, 1010], [12, 2750, 1010], [13, 3000, 1010], [14, 3250, 1010], [15, 3500, 1010], [16, 3750, 1010]]) {
      const accepted = drive555EventWindowDetector.accept(window, { observation: observe(sequence, at, { player: { x: 0, z, velocityX: 0, velocityZ: 0 } }), reflectedDecisionIds: ["decision-1"] }); window = accepted.nextState; assert.equal(accepted.eventDrafts.length, 0);
    }
    const stalled = drive555EventWindowDetector.accept(window, { observation: observe(17, 4000, { player: { x: 0, z: 1010, velocityX: 0, velocityZ: 0 } }), reflectedDecisionIds: ["decision-1"] });
    assert.deepEqual(stalled.eventDrafts, [{ type: "player.stalled", payload: { fromSourceObservationSequence: 1, toSourceObservationSequence: 17, plateauStartedAtAuthorityMs: 0, observedAtAuthorityMs: 4000, minimumZ: 1000, maximumZ: 1010, positionRange: 10, qualifyingDecisionIds: ["decision-1"] } }]);
    assert.equal(drive555EventWindowDetector.accept(stalled.nextState, { observation: observe(18, 4250, { player: { x: 0, z: 1010, velocityX: 0, velocityZ: 0 } }), reflectedDecisionIds: ["decision-1"] }).eventDrafts.length, 0);
  });

  it("replays irregular gap-free samples with the exact plateau start source sequence", () => {
    let first = drive555EventWindowDetector.initialState(); let second = drive555EventWindowDetector.initialState();
    const samples: Array<[number, number, number]> = [[40, 100, 2000], [41, 360, 2003], [42, 590, 2007], [43, 880, 2009], [44, 1150, 2010], [45, 1420, 2010], [46, 1690, 2010], [47, 1960, 2010], [48, 2230, 2010], [49, 2500, 2010], [50, 2770, 2010], [51, 3040, 2010], [52, 3310, 2010], [53, 3580, 2010], [54, 3850, 2010], [55, 4100, 2010]];
    let drafts: import("../../contracts.js").GameEventDraft[] = [];
    for (const [sequence, at, z] of samples) {
      const input = { observation: observe(sequence, at, { player: { x: 0, z, velocityX: 0, velocityZ: 0 } }), reflectedDecisionIds: ["decision-1"] };
      const a = drive555EventWindowDetector.accept(first, input); const b = drive555EventWindowDetector.accept(second, input);
      first = a.nextState; second = b.nextState; drafts = a.eventDrafts; assert.deepEqual(a, b);
    }
    assert.equal(first.plateauStartedSourceObservationSequence, 40);
    assert.deepEqual(drafts, [{ type: "player.stalled", payload: { fromSourceObservationSequence: 40, toSourceObservationSequence: 55, plateauStartedAtAuthorityMs: 100, observedAtAuthorityMs: 4100, minimumZ: 2000, maximumZ: 2010, positionRange: 10, qualifyingDecisionIds: ["decision-1"] } }]);
  });

  it("retains exact sorted earlier reflected forward decisions through an irregular plateau replay", () => {
    const forward = { accelerate: 1, brake: 0, steer: 0 }; let state = drive555EventWindowDetector.initialState(); let drafts: import("../../contracts.js").GameEventDraft[] = [];
    const samples: Array<[number, number, number, string | null, readonly string[]]> = [[40, 100, 2000, "z-forward", ["z-forward"]], [41, 360, 2003, "a-forward", ["a-forward"]], [42, 590, 2007, null, []], [43, 880, 2009, null, []], [44, 1150, 2010, null, []], [45, 1420, 2010, null, []], [46, 1690, 2010, null, []], [47, 1960, 2010, null, []], [48, 2230, 2010, null, []], [49, 2500, 2010, null, []], [50, 2770, 2010, null, []], [51, 3040, 2010, null, []], [52, 3310, 2010, null, []], [53, 3580, 2010, null, []], [54, 3850, 2010, null, []], [55, 4100, 2010, null, []]];
    for (const [sequence, at, z, decisionId, reflectedDecisionIds] of samples) {
      const appliedDecision = decisionId === null ? undefined : { ...correlation(decisionId), appliedControlsDigest: digest(forward) };
      const accepted = drive555EventWindowDetector.accept(state, { observation: observeWithAppliedControl(sequence, at, forward, appliedDecision, "agent", { player: { x: 0, z, velocityX: 0, velocityZ: 0 } }), reflectedDecisionIds }); state = accepted.nextState; drafts = accepted.eventDrafts;
    }
    assert.deepEqual(state.qualifyingReflectedForwardDecisionIds, ["a-forward", "z-forward"]);
    assert.deepEqual(drafts, [{ type: "player.stalled", payload: { fromSourceObservationSequence: 40, toSourceObservationSequence: 55, plateauStartedAtAuthorityMs: 100, observedAtAuthorityMs: 4100, minimumZ: 2000, maximumZ: 2010, positionRange: 10, qualifyingDecisionIds: ["a-forward", "z-forward"] } }]);
  });

  it("rejects unreflected, non-forward, harness, undecided, late, reversed, and unrelated candidate controls", () => {
    const forward = { accelerate: 1, brake: 0, steer: 0 }; const neutral = { accelerate: 0, brake: 0, steer: 0 };
    const agentForward = { ...correlation("agent-forward"), appliedControlsDigest: digest(forward) };
    const harnessForward = { ...correlation("harness-forward"), ownerType: "certification_harness" as const, appliedControlsDigest: digest(forward) };
    const nonForward = { ...correlation("agent-neutral"), appliedControlsDigest: digest(neutral) };
    const cases: Array<{ observation: ReturnType<typeof observeWithAppliedControl>; reflectedDecisionIds: readonly string[] }> = [
      { observation: observeWithAppliedControl(1, 100, neutral, nonForward), reflectedDecisionIds: ["agent-neutral"] },
      { observation: observeWithAppliedControl(1, 100, forward, agentForward), reflectedDecisionIds: [] },
      { observation: observeWithAppliedControl(1, 100, forward, harnessForward, "certification_harness"), reflectedDecisionIds: ["harness-forward"] },
      { observation: observeWithAppliedControl(1, 100, forward, undefined), reflectedDecisionIds: ["agent-forward"] },
      { observation: observeWithAppliedControl(1, 100, forward, agentForward), reflectedDecisionIds: ["later-receipt"] },
      { observation: observeWithAppliedControl(3, 300, forward, agentForward), reflectedDecisionIds: ["unrelated"] },
    ];
    for (const input of cases) assert.deepEqual(drive555EventWindowDetector.accept(drive555EventWindowDetector.initialState(), input).nextState.qualifyingReflectedForwardDecisionIds, []);
    const beforeReceipt = drive555EventWindowDetector.accept(drive555EventWindowDetector.initialState(), { observation: observeWithAppliedControl(1, 100, forward, agentForward), reflectedDecisionIds: [] });
    const afterReceipt = drive555EventWindowDetector.accept(beforeReceipt.nextState, { observation: observeWithAppliedControl(2, 200, forward, undefined), reflectedDecisionIds: ["agent-forward"] });
    assert.deepEqual(afterReceipt.nextState.qualifyingReflectedForwardDecisionIds, []);
    const first = drive555EventWindowDetector.accept(drive555EventWindowDetector.initialState(), { observation: observeWithAppliedControl(2, 200, forward, agentForward), reflectedDecisionIds: ["agent-forward"] });
    const replay = drive555EventWindowDetector.accept(first.nextState, { observation: observeWithAppliedControl(1, 100, forward, agentForward), reflectedDecisionIds: ["agent-forward"] });
    assert.deepEqual(replay.nextState.qualifyingReflectedForwardDecisionIds, []);
    assert.equal(replay.nextState.plateauStartedSourceObservationSequence, 1);
  });

  it("clears qualifying reflected decisions on forward progress and run restart", () => {
    const forward = { accelerate: 1, brake: 0, steer: 0 }; const decision = { ...correlation("forward"), appliedControlsDigest: digest(forward) };
    const first = drive555EventWindowDetector.accept(drive555EventWindowDetector.initialState(), { observation: observeWithAppliedControl(1, 100, forward, decision), reflectedDecisionIds: ["forward"] });
    const progressed = drive555EventWindowDetector.accept(first.nextState, { observation: observeWithAppliedControl(2, 200, forward, undefined, "agent", { player: { x: 0, z: 2020, velocityX: 0, velocityZ: 0 } }), reflectedDecisionIds: [] });
    assert.deepEqual(progressed.nextState.qualifyingReflectedForwardDecisionIds, []);
    const restarted = drive555EventWindowDetector.accept(first.nextState, { observation: { ...observeWithAppliedControl(1, 100, forward, undefined), gameRunId: "run-2" }, reflectedDecisionIds: [] });
    assert.deepEqual(restarted.nextState.qualifyingReflectedForwardDecisionIds, []);
  });

  it("resets to and qualifies a valid forward discontinuity as the exact new plateau start", () => {
    const forward = { accelerate: 1, brake: 0, steer: 0 }; const decision = { ...correlation("gap-forward"), appliedControlsDigest: digest(forward) };
    let state = drive555EventWindowDetector.accept(drive555EventWindowDetector.initialState(), { observation: observeWithAppliedControl(1, 100, forward, undefined), reflectedDecisionIds: [] }).nextState;
    const gap = drive555EventWindowDetector.accept(state, { observation: observeWithAppliedControl(3, 500, forward, decision), reflectedDecisionIds: ["gap-forward"] }); state = gap.nextState;
    assert.equal(state.plateauStartedSourceObservationSequence, 3); assert.deepEqual(state.qualifyingReflectedForwardDecisionIds, ["gap-forward"]);
    let drafts = gap.eventDrafts;
    for (let sequence = 4, at = 750; at <= 4500; sequence += 1, at += 250) {
      const accepted = drive555EventWindowDetector.accept(state, { observation: observeWithAppliedControl(sequence, at, forward, undefined), reflectedDecisionIds: [] }); state = accepted.nextState; drafts = accepted.eventDrafts;
    }
    assert.deepEqual(drafts, [{ type: "player.stalled", payload: { fromSourceObservationSequence: 3, toSourceObservationSequence: 19, plateauStartedAtAuthorityMs: 500, observedAtAuthorityMs: 4500, minimumZ: 2000, maximumZ: 2000, positionRange: 0, qualifyingDecisionIds: ["gap-forward"] } }]);
  });

  it("freezes qualifying IDs after one stall emission until a reset rearm", () => {
    const forward = { accelerate: 1, brake: 0, steer: 0 }; let state = drive555EventWindowDetector.initialState(); let firstDrafts: import("../../contracts.js").GameEventDraft[] = [];
    for (let sequence = 1, at = 0; at <= 4000; sequence += 1, at += 250) {
      const id = sequence === 1 ? "first-forward" : `later-${sequence}`; const decision = { ...correlation(id), appliedControlsDigest: digest(forward) };
      const accepted = drive555EventWindowDetector.accept(state, { observation: observeWithAppliedControl(sequence, at, forward, decision), reflectedDecisionIds: [id] }); state = accepted.nextState; firstDrafts = accepted.eventDrafts;
    }
    assert.deepEqual(firstDrafts[0]?.payload, { fromSourceObservationSequence: 1, toSourceObservationSequence: 17, plateauStartedAtAuthorityMs: 0, observedAtAuthorityMs: 4000, minimumZ: 2000, maximumZ: 2000, positionRange: 0, qualifyingDecisionIds: ["first-forward", ...Array.from({ length: 16 }, (_, index) => `later-${index + 2}`)].sort() });
    const frozen = drive555EventWindowDetector.accept(state, { observation: observeWithAppliedControl(18, 4250, forward, { ...correlation("later-18"), appliedControlsDigest: digest(forward) }), reflectedDecisionIds: ["later-18"] });
    assert.deepEqual(frozen.nextState.qualifyingReflectedForwardDecisionIds, state.qualifyingReflectedForwardDecisionIds);
    assert.equal(frozen.eventDrafts.length, 0);
  });
});
