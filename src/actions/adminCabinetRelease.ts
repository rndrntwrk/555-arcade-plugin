import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const adminCabinetReleaseAction: Action = {
  name: "ARCADE555_CABINET_RELEASE",
  description: "Release a previously possessed arcade cabinet.",
  similes: ["RELEASE_CABINET", "UNPOSSESS_CABINET", "RELEASE_MACHINE"],
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

    const cabinetId =
      extractTextOption(message, options, "cabinetId") ||
      extractTextOption(message, options, "gameId");
    if (!cabinetId) {
      callback?.({
        text: "ARCADE555_CABINET_RELEASE requires cabinetId or gameId.",
        content: { success: false, error: "missing_cabinet_id" },
      });
      return false;
    }

    try {
      const result = await service.adminCabinetRelease({ cabinetId });
      callback?.({
        text: `Cabinet released: ${cabinetId}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Cabinet release failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "release cabinet knighthood" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Releasing cabinet.", action: "ARCADE555_CABINET_RELEASE" },
      },
    ],
  ] as ActionExample[][],
};

export default adminCabinetReleaseAction;
