import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

const QUEST_STATUS_VALUES = new Set(["active", "completed", "all"]);

export const questsReadAction: Action = {
  name: "ARCADE555_QUESTS_READ",
  description: "Read quest/challenge state for arcade progression.",
  similes: ["ARCADE_READ_QUESTS", "ARCADE_LIST_QUESTS", "READ_555_QUESTS"],
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
    const status = (extractTextOption(message, options, "status") || "active")
      .trim()
      .toLowerCase();

    if (!QUEST_STATUS_VALUES.has(status)) {
      callback?.({
        text: "ARCADE555_QUESTS_READ status must be one of: active | completed | all.",
        content: { success: false, error: "invalid_status" },
      });
      return false;
    }

    try {
      const result = await service.questsRead({
        userId,
        status: status as "active" | "completed" | "all",
      });
      callback?.({
        text: "Quest list loaded.",
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Quest read failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "show active quests" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Loading active quests.", action: "ARCADE555_QUESTS_READ" },
      },
    ],
  ] as ActionExample[][],
};

export default questsReadAction;
