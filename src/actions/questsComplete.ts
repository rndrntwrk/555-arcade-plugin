import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const questsCompleteAction: Action = {
  name: "ARCADE555_QUESTS_COMPLETE",
  description: "Mark a quest as complete for a specific user.",
  similes: ["ARCADE_COMPLETE_QUEST", "FINISH_555_QUEST", "CLAIM_555_QUEST"],
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

    const questId = extractTextOption(message, options, "questId");
    const userId = extractTextOption(message, options, "userId");

    if (!questId || !userId) {
      callback?.({
        text: "ARCADE555_QUESTS_COMPLETE requires questId and userId.",
        content: { success: false, error: "missing_payload" },
      });
      return false;
    }

    try {
      const result = await service.questsComplete({ questId, userId });
      callback?.({
        text: `Quest completion recorded for ${userId}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Quest completion failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "complete quest q-123 for alice" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Recording quest completion.",
          action: "ARCADE555_QUESTS_COMPLETE",
        },
      },
    ],
  ] as ActionExample[][],
};

export default questsCompleteAction;
