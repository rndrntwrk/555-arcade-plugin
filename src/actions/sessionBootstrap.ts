import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const sessionBootstrapAction: Action = {
  name: "ARCADE555_SESSION_BOOTSTRAP",
  description: "Create or resume an arcade session and bind it as active.",
  similes: ["ARCADE_BOOTSTRAP", "ARCADE_SESSION_START", "ARCADE_BIND_SESSION"],
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
    const sessionId = extractTextOption(message, options, "sessionId");
    try {
      const session = await service.bootstrapSession(sessionId);
      callback?.({
        text: `Arcade session bound: ${session.id}`,
        content: { success: true, data: session },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Session bootstrap failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "bootstrap arcade session" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Creating or resuming the arcade session.",
          action: "ARCADE555_SESSION_BOOTSTRAP",
        },
      },
    ],
  ] as ActionExample[][],
};

export default sessionBootstrapAction;

