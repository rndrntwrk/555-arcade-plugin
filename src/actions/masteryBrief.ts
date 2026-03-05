import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import {
  canonicalizeMasteryGameId,
  getMasteryContract,
} from "../mastery/index.js";
import { extractTextOption } from "./shared.js";

export const masteryBriefAction: Action = {
  name: "ARCADE555_MASTERY_BRIEF",
  description: "Return the canonical mastery contract for a game.",
  similes: [
    "ARCADE555_GAMES_MASTERY_BRIEF",
    "ARCADE_MASTERY_BRIEF",
    "GET_ARCADE_MASTERY_BRIEF",
  ],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => {
    const requestedGameId = extractTextOption(message, options, "gameId");
    if (!requestedGameId) {
      callback?.({
        text: "ARCADE555_MASTERY_BRIEF requires gameId.",
        content: { success: false, error: "missing_game_id" },
      });
      return false;
    }

    try {
      const gameId = canonicalizeMasteryGameId(requestedGameId);
      const contract = getMasteryContract(gameId);
      callback?.({
        text: `Loaded mastery brief for ${gameId}.`,
        content: { success: true, data: { gameId, contract } },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Mastery brief failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "show the mastery brief for ninja" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Loading the ninja mastery contract.",
          action: "ARCADE555_MASTERY_BRIEF",
        },
      },
    ],
  ] as ActionExample[][],
};

export default masteryBriefAction;
