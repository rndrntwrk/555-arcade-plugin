import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { runArcadeGamesCatalog } from "./gamesAgentRuntime.js";

export const gamesCatalogAction: Action = {
  name: "ARCADE555_GAMES_CATALOG",
  description: "List available arcade games for the active session.",
  similes: ["ARCADE_LIST_GAMES", "ARCADE_CATALOG", "GAMES_CATALOG_555"],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => runArcadeGamesCatalog(runtime, message, state, options, callback),
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
