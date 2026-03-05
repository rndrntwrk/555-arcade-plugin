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

function parseMetadata(raw: string | undefined): Record<string, unknown> {
  if (!raw || raw.trim().length === 0) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return { note: raw.trim() };
  }
  return { note: raw.trim() };
}

export const battlesCreateAction: Action = {
  name: "ARCADE555_BATTLES_CREATE",
  description: "Create a new battle challenge.",
  similes: [
    "ARCADE_CREATE_BATTLE",
    "START_ARCADE_BATTLE",
    "DUEL_USER",
    "CREATE_CHALLENGE",
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

    const gameId = extractTextOption(message, options, "gameId");
    const targetId = extractTextOption(message, options, "targetId");
    const wagerAmount = extractNumberOption(message, options, "wager");
    const currencyMint = extractTextOption(message, options, "currencyMint");
    const metadataRaw = extractTextOption(message, options, "metadata");

    if (!gameId) {
      callback?.({
        text: "ARCADE555_BATTLES_CREATE requires gameId.",
        content: { success: false, error: "missing_game_id" },
      });
      return false;
    }

    try {
      const result = await service.battlesCreate({
        gameId,
        targetId,
        wagerAmount: wagerAmount ?? 100,
        currencyMint,
        metadata: parseMetadata(metadataRaw),
      });
      callback?.({
        text: `Battle challenge created for ${gameId}.`,
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Battle create failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "create battle for sector-13 with wager 250" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Creating battle challenge.", action: "ARCADE555_BATTLES_CREATE" },
      },
    ],
  ] as ActionExample[][],
};

export default battlesCreateAction;
