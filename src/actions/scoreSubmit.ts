import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractNumberOption, extractTextOption, getArcadeService } from "./shared.js";

export const scoreSubmitAction: Action = {
  name: "ARCADE555_SCORE_SUBMIT",
  description: "Submit a ranked score through the canonical 555 backend game record route.",
  similes: ["ARCADE_SUBMIT_SCORE", "REPORT_ARCADE_SCORE", "LEADERBOARD_SCORE_SUBMIT"],
  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    return Boolean(getArcadeService(runtime));
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    const service = getArcadeService(runtime);
    if (!service) {
      callback?.({ text: "555 Arcade service unavailable.", content: { success: false } });
      return false;
    }

    const sessionId = extractTextOption(message, options, "sessionId");
    const gameId = extractTextOption(message, options, "gameId");
    const score = extractNumberOption(message, options, "score");
    const runId = extractTextOption(message, options, "runId");

    if (!gameId || score === undefined) {
      callback?.({
        text: "ARCADE555_SCORE_SUBMIT requires gameId and score.",
        content: { success: false, error: "missing_score_payload" },
      });
      return false;
    }

    try {
      const result = await service.submitScore(sessionId, { gameId, score, runId });
      callback?.({
        text: `Ranked score submitted for ${gameId}: ${score}`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Score submit failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "submit score 1200 for knighthood" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Submitting knighthood ranked score through the canonical 555 record route.", action: "ARCADE555_SCORE_SUBMIT" },
      },
    ],
  ] as ActionExample[][],
};

export default scoreSubmitAction;
