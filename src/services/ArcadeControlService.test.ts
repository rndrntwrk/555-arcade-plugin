import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { IAgentRuntime } from "../types/index.js";
import { ArcadeControlService } from "./ArcadeControlService.js";

const ARCADE_ENV_KEYS = [
  "ARCADE555_BASE_URL",
  "ARCADE555_AGENT_API_KEY",
  "ARCADE555_AGENT_TOKEN",
  "STREAM555_AGENT_API_KEY",
  "STREAM555_AGENT_TOKEN",
  "STREAM_API_BEARER_TOKEN",
  "ARCADE555_DEFAULT_SESSION_ID",
  "ARCADE555_LEADERBOARD_API_URL",
  "ARCADE555_QUESTS_API_URL",
  "ARCADE555_SCORE_CAPTURE_API_URL",
] as const;

const ORIGINAL_ENV = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined): void {
  if (!ORIGINAL_ENV.has(key)) {
    ORIGINAL_ENV.set(key, process.env[key]);
  }
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

describe("ArcadeControlService", () => {
  beforeEach(() => {
    for (const key of ARCADE_ENV_KEYS) {
      setEnv(key, undefined);
    }
  });

  afterEach(() => {
    for (const [key, value] of ORIGINAL_ENV.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    ORIGINAL_ENV.clear();
  });

  it("starts through the runtime service contract and reports canonical readiness surfaces", async () => {
    setEnv("ARCADE555_BASE_URL", "https://stream.rndrntwrk.com");
    setEnv("ARCADE555_AGENT_TOKEN", "arcade-static-token");
    setEnv("ARCADE555_DEFAULT_SESSION_ID", "sess_arcade_001");
    setEnv(
      "ARCADE555_LEADERBOARD_API_URL",
      "https://stream.rndrntwrk.com/api/leaderboard",
    );
    setEnv(
      "ARCADE555_QUESTS_API_URL",
      "https://stream.rndrntwrk.com/api/quests",
    );
    setEnv(
      "ARCADE555_SCORE_CAPTURE_API_URL",
      "https://stream.rndrntwrk.com/api/score",
    );

    const service = await ArcadeControlService.start({} as IAgentRuntime);
    const runtimeState = service.getRuntimeState();

    assert.equal(service.serviceType, "arcade555");
    assert.equal(runtimeState.loaded, true);
    assert.equal(runtimeState.authenticated, true);
    assert.equal(runtimeState.catalogReachable, true);
    assert.equal(runtimeState.scorePipelineReachable, true);
    assert.equal(runtimeState.leaderboardReachable, true);
    assert.equal(runtimeState.questsReachable, true);
    assert.equal(runtimeState.sessionBootstrapped, true);
    assert.deepEqual(runtimeState.errors, []);

    await service.stop();
    assert.equal(service.getRuntimeState().loaded, false);
  });
});
