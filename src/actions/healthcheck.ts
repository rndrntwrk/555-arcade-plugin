import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { getArcadeService } from "./shared.js";

export const healthcheckAction: Action = {
  name: "ARCADE555_HEALTHCHECK",
  description: "Verify arcade API reachability and auth validity.",
  similes: ["CHECK_555_ARCADE", "VERIFY_ARCADE_CONNECTION", "ARCADE_HEALTHCHECK"],
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
      callback?.({
        text: "555 Arcade service is not initialized.",
        content: { success: false },
      });
      return false;
    }
    try {
      const result = await service.healthcheck();
      callback?.({
        text: result.allPassed
          ? "555 Arcade healthcheck passed."
          : `555 Arcade healthcheck failed: ${result.checks.authValid.message}`,
        content: { success: result.allPassed, data: result },
      });
      return result.allPassed;
    } catch (error) {
      callback?.({
        text: `555 Arcade healthcheck error: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "check arcade connection" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Running arcade healthcheck.", action: "ARCADE555_HEALTHCHECK" },
      },
    ],
  ] as ActionExample[][],
};

export default healthcheckAction;

