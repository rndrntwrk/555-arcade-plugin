import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

const STATUS_VALUES = new Set(["active", "pending", "resolved", "all"]);

export const battlesReadAction: Action = {
  name: "ARCADE555_BATTLES_READ",
  description: "Read battle records by status.",
  similes: ["ARCADE_READ_BATTLES", "LIST_ARCADE_BATTLES", "READ_555_BATTLES"],
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

    const status = (extractTextOption(message, options, "status") || "active")
      .trim()
      .toLowerCase();
    if (!STATUS_VALUES.has(status)) {
      callback?.({
        text: "ARCADE555_BATTLES_READ status must be one of: active | pending | resolved | all.",
        content: { success: false, error: "invalid_status" },
      });
      return false;
    }

    try {
      const result = await service.battlesRead({
        status: status as "active" | "pending" | "resolved" | "all",
      });
      callback?.({
        text: "Battles loaded.",
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Battle read failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "show active battles" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Loading active battles.", action: "ARCADE555_BATTLES_READ" },
      },
    ],
  ] as ActionExample[][],
};

export default battlesReadAction;
