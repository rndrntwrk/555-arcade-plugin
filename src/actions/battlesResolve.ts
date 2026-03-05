import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const battlesResolveAction: Action = {
  name: "ARCADE555_BATTLES_RESOLVE",
  description: "Resolve a battle with winner attribution.",
  similes: [
    "ARCADE_RESOLVE_BATTLE",
    "SETTLE_ARCADE_BATTLE",
    "RESOLVE_555_BATTLE",
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

    const battleId = extractTextOption(message, options, "battleId");
    const winnerId = extractTextOption(message, options, "winnerId");
    if (!battleId || !winnerId) {
      callback?.({
        text: "ARCADE555_BATTLES_RESOLVE requires battleId and winnerId.",
        content: { success: false, error: "missing_payload" },
      });
      return false;
    }

    try {
      const result = await service.battlesResolve({ battleId, winnerId });
      callback?.({
        text: `Battle ${battleId} resolved.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Battle resolve failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "resolve battle b-123 winner alice" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Resolving battle.", action: "ARCADE555_BATTLES_RESOLVE" },
      },
    ],
  ] as ActionExample[][],
};

export default battlesResolveAction;
