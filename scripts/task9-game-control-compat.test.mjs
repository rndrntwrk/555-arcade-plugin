import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { test } from "bun:test";

import { FixedDeterministicClock } from "../src/gameplay-core/testing.ts";
import { racingLineController } from "../src/gameplay-core/games/555drive/racing-line.ts";

test("a real racing-line intent passes Task9 protocol and authority-key validation", async () => {
  const task9Root = process.env.GAMEPLAY_TASK9_ROOT;
  assert.ok(task9Root, "GAMEPLAY_TASK9_ROOT must identify the Task9 integration checkout");
  const protocol = await import(pathToFileURL(resolve(task9Root, "services/shared/gameplayProtocol.js")).href);
  const authority = await import(pathToFileURL(resolve(task9Root, "services/shared/gameplayAuthority.js")).href);

  const policy = {
    reactionWindowMs: 200,
    riskTolerance: 0.25,
    recenterBias: 0.5,
    hazardAvoidanceBias: 0.75,
  };
  const observation = {
    gameRunId: "run-1",
    sourceId: "source-1",
    fence: 7,
    controlOwnerType: "agent",
    runtimeProvenanceDigest: "a".repeat(64),
    evidenceWindowContextDigest: "b".repeat(64),
    observationSchemaVersion: "555drive.observation.v1",
    sequence: 9,
    sourceObservationSequence: 9,
    sourceObservationDigest: "c".repeat(64),
    observedAtAuthorityMs: 1000,
    lifecycle: "playing",
    gameState: {
      lifecycle: "playing",
      frame: 1,
      trackSeed: 1331,
      player: { x: 4, z: 2000, velocityX: 0, velocityZ: 30 },
      checkpoint: 1,
      remainingTimeMs: 50_000,
      score: 0,
      collisionSequence: 0,
      lastCollision: null,
      hazards: [{ id: "car", relativeX: 3, relativeZ: 50, relativeVelocityZ: -10 }],
    },
  };
  const directive = {
    gameRunId: "run-1",
    leaseId: "lease-1",
    fence: 7,
    directiveId: "directive-1",
    directiveDigest: "d".repeat(64),
    goal: "finish",
    strategyFamily: "racing_line",
    gameplayPolicyId: "racing_line",
    gameplayPolicyVersion: 1,
    gameplayPolicyDigest: "e".repeat(64),
    policySnapshot: policy,
    recoveryPolicy: {},
    memoryProvenanceIds: [],
    issuedAtAgentMonotonicMs: 1,
    validForMs: 250,
    agentClockDomainId: "agent",
  };

  const { intent } = racingLineController.decide({
    observation,
    directive,
    state: racingLineController.initialState(policy),
    clock: new FixedDeterministicClock(42),
  });

  assert.equal(protocol.validateGameControlIntent(intent), intent);
  assert.match(intent.decisionId, /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/);
  const keys = authority.gameplayAuthorityKeys({
    sessionId: "session-1",
    gameRunId: intent.gameRunId,
    decisionId: intent.decisionId,
  });
  assert.equal(keys.decision, `gameplay:run:run-1:decision:${intent.decisionId}`);
});
