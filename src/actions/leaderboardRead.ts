import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

const BOARD_VALUES = new Set(["global", "game"]);

export const leaderboardReadAction: Action = {
  name: "ARCADE555_LEADERBOARD_READ",
  description: "Read leaderboard standings (global or per-game).",
  similes: [
    "ARCADE_LEADERBOARD_READ",
    "ARCADE_GET_LEADERBOARD",
    "READ_555_LEADERBOARD",
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

    const board = (extractTextOption(message, options, "board") || "global")
      .trim()
      .toLowerCase();
    const gameId = extractTextOption(message, options, "gameId");

    if (!BOARD_VALUES.has(board)) {
      callback?.({
        text: "ARCADE555_LEADERBOARD_READ board must be one of: global | game.",
        content: { success: false, error: "invalid_board" },
      });
      return false;
    }

    if (board === "game" && !gameId) {
      callback?.({
        text: "ARCADE555_LEADERBOARD_READ requires gameId when board=game.",
        content: { success: false, error: "missing_game_id" },
      });
      return false;
    }

    try {
      const result = await service.leaderboardRead({
        board: board as "global" | "game",
        gameId,
      });
      callback?.({
        text: "Leaderboard loaded.",
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Leaderboard read failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "show global leaderboard" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Loading leaderboard standings.",
          action: "ARCADE555_LEADERBOARD_READ",
        },
      },
    ],
  ] as ActionExample[][],
};

export default leaderboardReadAction;
