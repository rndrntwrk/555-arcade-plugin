import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const scoreReadAction: Action = {
  name: "ARCADE555_SCORE_READ",
  description: "Read latest captured score for a game and session.",
  similes: ["ARCADE_READ_SCORE", "READ_CAPTURED_SCORE", "ARCADE_SCORE_READ"],
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
    if (!gameId || !sessionId) {
      callback?.({
        text: "ARCADE555_SCORE_READ requires gameId and sessionId.",
        content: { success: false, error: "missing_payload" },
      });
      return false;
    }

    try {
      const result = await service.scoreRead({ gameId, sessionId });
      callback?.({
        text: "Captured score loaded.",
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Score read failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "read captured score for knighthood in session abc123" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Loading captured score.", action: "ARCADE555_SCORE_READ" },
      },
    ],
  ] as ActionExample[][],
};

export default scoreReadAction;
