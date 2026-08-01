import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { digestWithout } from "../../canonical.js";
import { sha256Canonical } from "../../canonical.js";
import { FixedDeterministicClock } from "../../testing.js";
import { DRIVE555_INITIAL_FIXTURE, racingLineController, type RacingLinePolicy } from "./racing-line.js";
import type { Drive555RawState } from "./adapter.js";

const raw = (playerX = 4, hazards: Drive555RawState["hazards"] = [{ id: "car", relativeX: 3, relativeZ: 50, relativeVelocityZ: -10 }]): Drive555RawState => ({ lifecycle: "playing", frame: 1, trackSeed: 1331, player: { x: playerX, z: 2000, velocityX: 0, velocityZ: 30 }, checkpoint: 1, remainingTimeMs: 50_000, score: 0, collisionSequence: 0, lastCollision: null, hazards });
const observation = (gameState = raw()): import("../../contracts.js").GameObservation<Drive555RawState> => ({ gameRunId: "run-1", sourceId: "source-1", fence: 7, controlOwnerType: "agent", runtimeProvenanceDigest: "a".repeat(64), evidenceWindowContextDigest: "b".repeat(64), observationSchemaVersion: "555drive.observation.v1", sequence: 9, sourceObservationSequence: 9, sourceObservationDigest: "c".repeat(64), observedAtAuthorityMs: 1000, lifecycle: gameState.lifecycle, gameState });
const policy: RacingLinePolicy = { reactionWindowMs: 200, riskTolerance: .25, recenterBias: .5, hazardAvoidanceBias: .75 };
function directive(policySnapshot = policy): import("../../contracts.js").AgentGameDirective<RacingLinePolicy> {
  const base = { gameRunId: "run-1", leaseId: "lease-1", fence: 7, directiveId: "directive-1", goal: "finish", strategyFamily: "racing_line", gameplayPolicyId: "racing_line", gameplayPolicyVersion: 1, gameplayPolicyDigest: "d".repeat(64), policySnapshot, recoveryPolicy: {}, memoryProvenanceIds: [], issuedAtAgentMonotonicMs: 1, validForMs: 250, agentClockDomainId: "agent" };
  return { ...base, directiveDigest: digestWithout(base, []) };
}
const decide = (changes: Partial<RacingLinePolicy> = {}, gameState = raw()) => racingLineController.decide({ observation: observation(gameState), directive: directive({ ...policy, ...changes }), state: racingLineController.initialState(policy), clock: new FixedDeterministicClock(42) });
const command = (result: ReturnType<typeof decide>, id: string) => result.intent.commands.find((entry) => entry.controlId === id);

describe("racing line controller", () => {
  it("is deterministic for identical directive, observation, seed, clock, and state", () => {
    const first = decide(); const second = decide();
    assert.deepEqual(first, second); assert.equal(first.intent.decidedAtAgentMonotonicMs, 42);
    assert.equal(first.intent.maximumAgeMs, 250); assert.equal(first.intent.commands.length, 3);
    assert.match(first.intent.semanticIntentDigest, /^[a-f0-9]{64}$/);
  });

  it("keeps portable canonical digest parity with the approved helper and hand-derived golden values", () => {
    const result = decide();
    const unsignedIntent = { gameRunId: "run-1", leaseId: "lease-1", fence: 7, directiveId: "directive-1", decisionId: "directive-1:9:42", observationSequence: 9, decidedAtAgentMonotonicMs: 42, maximumAgeMs: 250, agentClockDomainId: "agent", commands: [{ kind: "analog", controlId: "accelerate", value: 1 }, { kind: "analog", controlId: "brake", value: .75 }, { kind: "analog", controlId: "steer", value: -1 }], reasonCode: "avoid_hazard" };
    const unsignedFixture = { schemaVersion: "555drive.initial-fixture.v1", fixtureId: "straight_start_1331_v1", trackSeed: 1331, playerX: 0, playerZ: 2000, playerVelocityX: 0, playerVelocityZ: 0 };
    assert.equal(result.intent.semanticIntentDigest, "6183a09166a327a56237cb5d78d934ac06c1443e2c0d31ff22bd9f96b9b059c2");
    assert.equal(DRIVE555_INITIAL_FIXTURE.fixtureDigest, "8c71295c3791e7ad062981fc852463beb241d2e3a40a885ff2ce18ab4a896bd5");
    assert.equal(result.intent.semanticIntentDigest, sha256Canonical(unsignedIntent));
    assert.equal(DRIVE555_INITIAL_FIXTURE.fixtureDigest, sha256Canonical(unsignedFixture));
  });

  it("accelerates only while playing and clamps a full replacement snapshot", () => {
    const active = decide();
    assert.deepEqual(active.intent.commands, [{ kind: "analog", controlId: "accelerate", value: 1 }, { kind: "analog", controlId: "brake", value: .75 }, { kind: "analog", controlId: "steer", value: -1 }]);
    const paused = decide({}, { ...raw(), lifecycle: "paused" });
    assert.deepEqual(paused.intent.commands, [{ kind: "analog", controlId: "accelerate", value: 0 }, { kind: "analog", controlId: "brake", value: 0 }, { kind: "analog", controlId: "steer", value: 0 }]);
  });

  it("gives each policy field an independent declared control effect", () => {
    assert.notDeepEqual(command(decide({ reactionWindowMs: 20 }), "brake"), command(decide({ reactionWindowMs: 1000 }), "brake"));
    assert.notDeepEqual(command(decide({ riskTolerance: 0 }), "brake"), command(decide({ riskTolerance: 1 }), "brake"));
    assert.notDeepEqual(command(decide({ recenterBias: 0 }), "steer"), command(decide({ recenterBias: 1 }), "steer"));
    assert.notDeepEqual(command(decide({ hazardAvoidanceBias: 0 }), "steer"), command(decide({ hazardAvoidanceBias: 1 }), "steer"));
  });
});
