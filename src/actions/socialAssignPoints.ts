import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import {
  extractNumberOption,
  extractTextOption,
  getArcadeService,
} from "./shared.js";

export const socialAssignPointsAction: Action = {
  name: "ARCADE555_SOCIAL_ASSIGN_POINTS",
  description: "Assign points from validated social interactions.",
  similes: [
    "ARCADE_SOCIAL_ASSIGN_POINTS",
    "ASSIGN_SOCIAL_POINTS",
    "SOCIAL_POINTS_UPDATE",
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

    const userId = extractTextOption(message, options, "userId");
    const points = extractNumberOption(message, options, "points");
    const reason = extractTextOption(message, options, "reason");
    if (!userId || points === undefined) {
      callback?.({
        text: "ARCADE555_SOCIAL_ASSIGN_POINTS requires userId and points.",
        content: { success: false, error: "missing_payload" },
      });
      return false;
    }

    try {
      const result = await service.socialAssignPoints({ userId, points, reason });
      callback?.({
        text: `Social points assigned for ${userId}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Social points assignment failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "assign 25 social points to alice for engagement" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Assigning social points.",
          action: "ARCADE555_SOCIAL_ASSIGN_POINTS",
        },
      },
    ],
  ] as ActionExample[][],
};

export default socialAssignPointsAction;
