import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import {
  extractNumberOption,
  extractTextOption,
  getArcadeService,
} from "./shared.js";

export const leaderboardWriteAction: Action = {
  name: "ARCADE555_LEADERBOARD_WRITE",
  description: "Write or upsert leaderboard score entries.",
  similes: [
    "ARCADE_LEADERBOARD_WRITE",
    "ARCADE_UPDATE_LEADERBOARD",
    "WRITE_555_LEADERBOARD",
  ],
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
      callback?.({
        text: "555 Arcade service unavailable.",
        content: { success: false },
      });
      return false;
    }

    const userId = extractTextOption(message, options, "userId");
    const gameId = extractTextOption(message, options, "gameId");
    const score = extractNumberOption(message, options, "score");

    if (!userId || score === undefined) {
      callback?.({
        text: "ARCADE555_LEADERBOARD_WRITE requires userId and score.",
        content: { success: false, error: "missing_payload" },
      });
      return false;
    }

    try {
      const result = await service.leaderboardWrite({
        userId,
        gameId,
        score,
      });
      callback?.({
        text: `Leaderboard updated for ${userId}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Leaderboard write failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "submit leaderboard score 5400 for alice on knighthood" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Updating leaderboard score.",
          action: "ARCADE555_LEADERBOARD_WRITE",
        },
      },
    ],
  ] as ActionExample[][],
};

export default leaderboardWriteAction;
