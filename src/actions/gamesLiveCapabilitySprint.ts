import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import { runArcadeGamesLiveCapabilitySprint } from "./gamesAgentRuntime.js";

export const gamesLiveCapabilitySprintAction: Action = {
  name: "ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT",
  description:
    "Run the Alice live capability sprint across the canonical arcade game order.",
  similes: [
    "ARCADE555_GAMES_SPRINT",
    "RUN_18_SLOT_GAME_SPRINT",
    "ALICE_GAME_CAPABILITY_SPRINT",
  ],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> =>
    runArcadeGamesLiveCapabilitySprint(runtime, message, state, options, callback),
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "run the arcade live capability sprint" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Starting the live capability sprint.",
          action: "ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT",
        },
      },
    ],
  ] as ActionExample[][],
};

export default gamesLiveCapabilitySprintAction;
