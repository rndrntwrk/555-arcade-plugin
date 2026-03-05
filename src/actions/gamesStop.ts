import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const gamesStopAction: Action = {
  name: "ARCADE555_GAMES_STOP",
  description: "Stop the active game for the current session.",
  similes: ["ARCADE_STOP_GAME", "END_ARCADE_GAME", "STOP_555_GAME"],
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
    try {
      const result = await service.gamesStop(sessionId);
      callback?.({
        text: "Arcade game stop requested.",
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Game stop failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "stop the current game" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Stopping the current arcade game.", action: "ARCADE555_GAMES_STOP" },
      },
    ],
  ] as ActionExample[][],
};

export default gamesStopAction;

