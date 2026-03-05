import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { getMasteryCertificationOrchestrator } from "../mastery/index.js";
import { extractTextOption } from "./shared.js";
import { getArcade555RuntimeConfig } from "../milaidy/runtime.js";

export const masteryStatusAction: Action = {
  name: "ARCADE555_MASTERY_STATUS",
  description: "Fetch persisted status for a mastery certification run.",
  similes: [
    "ARCADE555_GAMES_MASTERY_STATUS",
    "ARCADE_MASTERY_STATUS",
    "GET_ARCADE_MASTERY_STATUS",
  ],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => {
    const runId = extractTextOption(message, options, "runId");
    if (!runId) {
      callback?.({
        text: "ARCADE555_MASTERY_STATUS requires runId.",
        content: { success: false, error: "missing_run_id" },
      });
      return false;
    }

    try {
      getArcade555RuntimeConfig().capabilityGuard?.(
        "ARCADE555_MASTERY_STATUS",
        "games.observe",
      );
      const orchestrator = getMasteryCertificationOrchestrator();
      const run = await orchestrator.status(runId);
      if (!run) {
        throw new Error(`runId not found: ${runId}`);
      }
      callback?.({
        text: "Loaded mastery run status.",
        content: { success: true, data: { runId: run.runId, run } },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Mastery status failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "check mastery run stream-20260305T010203Z" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Loading mastery run status.",
          action: "ARCADE555_MASTERY_STATUS",
        },
      },
    ],
  ] as ActionExample[][],
};

export default masteryStatusAction;
