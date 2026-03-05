import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { extractTextOption, getArcadeService } from "./shared.js";

export const gamesCatalogAction: Action = {
  name: "ARCADE555_GAMES_CATALOG",
  description: "List available arcade games for the active session.",
  similes: ["ARCADE_LIST_GAMES", "ARCADE_CATALOG", "GAMES_CATALOG_555"],
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
    const filter = extractTextOption(message, options, "filter");
    const includeBeta = options?.includeBeta === true || message.content?.includeBeta === true;

    try {
      const catalog = await service.gamesCatalog(sessionId, { filter, includeBeta });
      const count = Array.isArray(catalog.games) ? catalog.games.length : 0;
      callback?.({
        text: `Arcade catalog loaded (${count} games).`,
        content: { success: true, data: catalog },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Catalog request failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "show arcade catalog" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Loading the game catalog.", action: "ARCADE555_GAMES_CATALOG" },
      },
    ],
  ] as ActionExample[][],
};

export default gamesCatalogAction;

