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

export const adminEventTriggerAction: Action = {
  name: "ARCADE555_EVENT_TRIGGER",
  description: "Trigger a timed platform event via arcade admin surface.",
  similes: ["TRIGGER_EVENT", "START_EVENT", "ACTIVATE_BONUS"],
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

    const type = extractTextOption(message, options, "type") || "double_xp";
    const durationMinutes = extractNumberOption(message, options, "durationMinutes");

    try {
      const result = await service.adminEventTrigger({
        type,
        durationMinutes: durationMinutes ?? 60,
      });
      callback?.({
        text: `Event triggered: ${type}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Event trigger failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "trigger double_xp event for 60 minutes" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Triggering event.", action: "ARCADE555_EVENT_TRIGGER" },
      },
    ],
  ] as ActionExample[][],
};

export default adminEventTriggerAction;
