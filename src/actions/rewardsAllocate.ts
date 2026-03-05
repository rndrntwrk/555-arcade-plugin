import type {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import {
  extractNumberOption,
  extractTextOption,
  getArcadeService,
} from "./shared.js";

const ASSET_VALUES = new Set(["USDC", "CREDITS"]);

export const rewardsAllocateAction: Action = {
  name: "ARCADE555_REWARDS_ALLOCATE",
  description: "Allocate rewards for a user in the selected asset.",
  similes: [
    "ARCADE_ALLOCATE_REWARDS",
    "SETTLE_ARCADE_REWARDS",
    "PAYOUT_555_REWARDS",
  ],
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

    const userId = extractTextOption(message, options, "userId");
    const amount = extractNumberOption(message, options, "amount");
    const asset = (extractTextOption(message, options, "asset") || "USDC")
      .trim()
      .toUpperCase();

    if (!userId || amount === undefined) {
      callback?.({
        text: "ARCADE555_REWARDS_ALLOCATE requires userId and amount.",
        content: { success: false, error: "missing_payload" },
      });
      return false;
    }
    if (!ASSET_VALUES.has(asset)) {
      callback?.({
        text: "ARCADE555_REWARDS_ALLOCATE asset must be one of: USDC | CREDITS.",
        content: { success: false, error: "invalid_asset" },
      });
      return false;
    }

    try {
      const result = await service.rewardsAllocate({
        userId,
        amount,
        asset: asset as "USDC" | "CREDITS",
      });
      callback?.({
        text: `Rewards allocated for ${userId}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Rewards allocation failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "allocate 50 USDC rewards to alice" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Allocating rewards.", action: "ARCADE555_REWARDS_ALLOCATE" },
      },
    ],
  ] as ActionExample[][],
};

export default rewardsAllocateAction;
