import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const adminThemeSetAction: Action = {
  name: "ARCADE555_THEME_SET",
  description: "Set active platform theme through arcade admin surface.",
  similes: ["ARCADE_THEME_SET", "UPDATE_THEME", "CHANGE_THEME", "SET_THEME"],
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

    const theme = extractTextOption(message, options, "theme");
    if (!theme) {
      callback?.({
        text: "ARCADE555_THEME_SET requires theme.",
        content: { success: false, error: "missing_theme" },
      });
      return false;
    }

    try {
      const result = await service.adminThemeSet({ theme });
      callback?.({
        text: `Theme updated to ${theme}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Theme update failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "set theme to neon" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Updating theme to neon.", action: "ARCADE555_THEME_SET" },
      },
    ],
  ] as ActionExample[][],
};

export default adminThemeSetAction;
