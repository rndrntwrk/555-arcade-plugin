import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { getMasteryCertificationOrchestrator } from "../mastery/index.js";
import {
  extractBooleanOption,
  extractNumberOption,
  extractStringArrayOption,
  extractTextOption,
} from "./shared.js";
import { getArcade555RuntimeConfig } from "../milaidy/runtime.js";

export const masteryCertifyAction: Action = {
  name: "ARCADE555_MASTERY_CERTIFY",
  description: "Start strict truth-gated mastery certification across the arcade game set.",
  similes: [
    "ARCADE555_GAMES_MASTERY_CERTIFY",
    "ARCADE_MASTERY_CERTIFY",
    "CERTIFY_ARCADE_MASTERY",
  ],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => {
    try {
      getArcade555RuntimeConfig().trustedAdminGuard?.(
        runtime,
        message,
        state,
        "ARCADE555_MASTERY_CERTIFY",
      );
      getArcade555RuntimeConfig().capabilityGuard?.(
        "ARCADE555_MASTERY_CERTIFY",
        "games.play",
      );
      getArcade555RuntimeConfig().capabilityGuard?.(
        "ARCADE555_MASTERY_CERTIFY",
        "games.observe",
      );

      const orchestrator = getMasteryCertificationOrchestrator();
      const run = await orchestrator.start({
        parameters: {
          suiteId: extractTextOption(message, options, "suiteId"),
          games: extractStringArrayOption(message, options, "games"),
          episodesPerGame: extractNumberOption(message, options, "episodesPerGame"),
          seedMode: extractTextOption(message, options, "seedMode"),
          maxDurationSec: extractNumberOption(message, options, "maxDurationSec"),
          strict: extractBooleanOption(message, options, "strict"),
          evidenceMode: extractTextOption(message, options, "evidenceMode"),
        },
      });

      callback?.({
        text: "Mastery certification accepted.",
        content: { success: true, data: { runId: run.runId, run } },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Mastery certification failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "run strict mastery certification for ninja and sector-13" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Starting strict mastery certification.",
          action: "ARCADE555_MASTERY_CERTIFY",
        },
      },
    ],
  ] as ActionExample[][],
};

export default masteryCertifyAction;
