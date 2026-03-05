import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

const WINDOW_VALUES = new Set(["daily", "weekly", "monthly"]);

export const rewardsProjectAction: Action = {
  name: "ARCADE555_REWARDS_PROJECT",
  description: "Project rewards based on points and activity windows.",
  similes: [
    "ARCADE_PROJECT_REWARDS",
    "REWARDS_PROJECTION",
    "PROJECT_555_REWARDS",
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
      callback?.({ text: "555 Arcade service unavailable.", content: { success: false } });
      return false;
    }

    const window = (extractTextOption(message, options, "window") || "weekly")
      .trim()
      .toLowerCase();
    const userId = extractTextOption(message, options, "userId");
    if (!WINDOW_VALUES.has(window)) {
      callback?.({
        text: "ARCADE555_REWARDS_PROJECT window must be one of: daily | weekly | monthly.",
        content: { success: false, error: "invalid_window" },
      });
      return false;
    }

    try {
      const result = await service.rewardsProject({
        window: window as "daily" | "weekly" | "monthly",
        userId,
      });
      callback?.({
        text: "Rewards projection ready.",
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Rewards projection failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "project weekly rewards for alice" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Projecting weekly rewards.", action: "ARCADE555_REWARDS_PROJECT" },
      },
    ],
  ] as ActionExample[][],
};

export default rewardsProjectAction;
