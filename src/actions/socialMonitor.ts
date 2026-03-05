import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

const SOURCE_VALUES = new Set(["twitter", "discord", "stream-chat"]);

export const socialMonitorAction: Action = {
  name: "ARCADE555_SOCIAL_MONITOR",
  description: "Read social interaction telemetry for scoring pipelines.",
  similes: [
    "ARCADE_SOCIAL_MONITOR",
    "READ_ARCADE_SOCIAL",
    "MONITOR_555_SOCIAL",
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

    const source = (extractTextOption(message, options, "source") || "twitter")
      .trim()
      .toLowerCase();
    const handle = extractTextOption(message, options, "handle");
    if (!SOURCE_VALUES.has(source)) {
      callback?.({
        text: "ARCADE555_SOCIAL_MONITOR source must be one of: twitter | discord | stream-chat.",
        content: { success: false, error: "invalid_source" },
      });
      return false;
    }

    try {
      const result = await service.socialMonitor({
        source: source as "twitter" | "discord" | "stream-chat",
        handle,
      });
      callback?.({
        text: "Social telemetry loaded.",
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Social monitor failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "monitor twitter social activity for @alice" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Monitoring social feed.", action: "ARCADE555_SOCIAL_MONITOR" },
      },
    ],
  ] as ActionExample[][],
};

export default socialMonitorAction;
