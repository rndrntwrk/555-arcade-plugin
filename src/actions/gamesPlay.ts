import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { runArcadeGamesPlay } from "./gamesAgentRuntime.js";

export const gamesPlayAction: Action = {
  name: "ARCADE555_GAMES_PLAY",
  description: "Launch an arcade game in the active session.",
  similes: ["ARCADE_PLAY", "START_555_GAME", "PLAY_ARCADE_GAME"],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => runArcadeGamesPlay(runtime, message, state, options, callback),
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "play knighthood" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Launching knighthood.", action: "ARCADE555_GAMES_PLAY" },
      },
    ],
  ] as ActionExample[][],
};

export default gamesPlayAction;
