import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { getArcadeService } from "./shared.js";

export const authVerifyAction: Action = {
  name: "ARCADE555_AUTH_VERIFY",
  description: "Verify the current arcade authentication token.",
  similes: ["VERIFY_ARCADE_AUTH", "ARCADE_AUTH_STATUS", "CHECK_ARCADE_TOKEN"],
  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    return Boolean(getArcadeService(runtime));
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    const service = getArcadeService(runtime);
    if (!service) {
      callback?.({ text: "555 Arcade service unavailable.", content: { success: false } });
      return false;
    }
    try {
      const result = await service.verifyAuth();
      callback?.({
        text: result.success ? "Arcade auth verified." : `Arcade auth failed: ${result.message}`,
        content: { success: result.success, message: result.message },
      });
      return result.success;
    } catch (error) {
      callback?.({
        text: `Arcade auth verification error: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "verify arcade auth" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Checking arcade authentication.", action: "ARCADE555_AUTH_VERIFY" },
      },
    ],
  ] as ActionExample[][],
};

export default authVerifyAction;

