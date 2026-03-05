import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { runArcadeGamesStop } from "./gamesAgentRuntime.js";

export const gamesStopAction: Action = {
  name: "ARCADE555_GAMES_STOP",
  description: "Stop the active game for the current session.",
  similes: ["ARCADE_STOP_GAME", "END_ARCADE_GAME", "STOP_555_GAME"],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => runArcadeGamesStop(runtime, message, state, options, callback),
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "stop the current game" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Stopping the current arcade game.", action: "ARCADE555_GAMES_STOP" },
      },
    ],
  ] as ActionExample[][],
};

export default gamesStopAction;
