import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { runArcadeGamesSwitch } from "./gamesAgentRuntime.js";

export const gamesSwitchAction: Action = {
  name: "ARCADE555_GAMES_SWITCH",
  description: "Switch from the current game to another game without ending the session.",
  similes: ["ARCADE_SWITCH_GAME", "SWAP_GAME", "CHANGE_ARCADE_GAME"],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => runArcadeGamesSwitch(runtime, message, state, options, callback),
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "switch game to ninja" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Switching to ninja.", action: "ARCADE555_GAMES_SWITCH" },
      },
    ],
  ] as ActionExample[][],
};

export default gamesSwitchAction;
