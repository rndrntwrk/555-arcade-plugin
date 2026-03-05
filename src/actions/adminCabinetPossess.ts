import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const adminCabinetPossessAction: Action = {
  name: "ARCADE555_CABINET_POSSESS",
  description: "Possess an arcade cabinet and attach operator metadata.",
  similes: ["POSSESS_CABINET", "CONTROL_CABINET", "OVERRIDE_CABINET"],
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

    const gameId =
      extractTextOption(message, options, "gameId") ||
      extractTextOption(message, options, "cabinetId");
    if (!gameId) {
      callback?.({
        text: "ARCADE555_CABINET_POSSESS requires gameId or cabinetId.",
        content: { success: false, error: "missing_game_id" },
      });
      return false;
    }

    try {
      const result = await service.adminCabinetPossess({
        gameId,
        agentId: extractTextOption(message, options, "agentId"),
        capability: extractTextOption(message, options, "capability"),
        value: extractTextOption(message, options, "value"),
        message: extractTextOption(message, options, "message"),
      });
      callback?.({
        text: `Cabinet possessed: ${gameId}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Cabinet possess failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "possess cabinet knighthood as operator" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Possessing cabinet.", action: "ARCADE555_CABINET_POSSESS" },
      },
    ],
  ] as ActionExample[][],
};

export default adminCabinetPossessAction;
