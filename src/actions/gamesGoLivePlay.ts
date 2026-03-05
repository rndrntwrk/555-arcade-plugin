import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { runArcadeGamesGoLivePlay } from "./gamesAgentRuntime.js";

export const gamesGoLivePlayAction: Action = {
  name: "ARCADE555_GAMES_GO_LIVE_PLAY",
  description:
    "Launch an arcade game in agent mode and ensure the Cloudflare stream output is provisioned.",
  similes: [
    "PLAY_GAME_GO_LIVE",
    "GO_LIVE_PLAY_GAME",
    "START_GAME_STREAM",
    "ARCADE555_GO_LIVE_PLAY",
  ],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> =>
    runArcadeGamesGoLivePlay(runtime, message, state, options, callback),
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "go live with sector-13" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Launching the game in go-live mode.",
          action: "ARCADE555_GAMES_GO_LIVE_PLAY",
        },
      },
    ],
  ] as ActionExample[][],
};

export default gamesGoLivePlayAction;
