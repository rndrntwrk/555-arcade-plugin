import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const gamesSwitchAction: Action = {
  name: "ARCADE555_GAMES_SWITCH",
  description: "Switch from the current game to another game without ending the session.",
  similes: ["ARCADE_SWITCH_GAME", "SWAP_GAME", "CHANGE_ARCADE_GAME"],
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

    const gameId = extractTextOption(message, options, "gameId");
    const sessionId = extractTextOption(message, options, "sessionId");
    const mode = extractTextOption(message, options, "mode") || "agent";
    const goal = extractTextOption(message, options, "goal");

    if (!gameId) {
      callback?.({
        text: "ARCADE555_GAMES_SWITCH requires gameId.",
        content: { success: false, error: "missing_game_id" },
      });
      return false;
    }

    try {
      const result = await service.gamesSwitch(sessionId, { gameId, mode, goal });
      callback?.({
        text: `Arcade switched to ${gameId}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Game switch failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "switch game to ninja" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Switching to ninja.", action: "ARCADE555_GAMES_SWITCH" },
      },
    ],
  ] as ActionExample[][],
};

export default gamesSwitchAction;

