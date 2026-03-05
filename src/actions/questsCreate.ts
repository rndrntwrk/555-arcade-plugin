import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const questsCreateAction: Action = {
  name: "ARCADE555_QUESTS_CREATE",
  description: "Create a new quest/challenge objective.",
  similes: ["ARCADE_CREATE_QUEST", "ARCADE_NEW_QUEST", "CREATE_555_QUEST"],
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

    const title = extractTextOption(message, options, "title");
    const objective = extractTextOption(message, options, "objective");

    if (!title || !objective) {
      callback?.({
        text: "ARCADE555_QUESTS_CREATE requires title and objective.",
        content: { success: false, error: "missing_payload" },
      });
      return false;
    }

    try {
      const result = await service.questsCreate({ title, objective });
      callback?.({
        text: `Quest created: ${title}`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Quest create failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "create quest: reach sector 7 in sector-13" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Creating that quest.", action: "ARCADE555_QUESTS_CREATE" },
      },
    ],
  ] as ActionExample[][],
};

export default questsCreateAction;
