import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import {
  canonicalizeMasteryGameId,
  findMasteryEpisodeById,
  readMasteryEpisodeConsistency,
  readMasteryEpisodeEvidence,
} from "../mastery/index.js";
import { extractTextOption } from "./shared.js";
import { getArcade555RuntimeConfig } from "../milaidy/runtime.js";

export const masteryValidateAction: Action = {
  name: "ARCADE555_MASTERY_VALIDATE",
  description: "Validate a mastery episode against strict runtime and visual gates.",
  similes: [
    "ARCADE555_GAMES_MASTERY_VALIDATE",
    "ARCADE_MASTERY_VALIDATE",
    "VALIDATE_ARCADE_MASTERY_EPISODE",
  ],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => {
    const gameIdRaw = extractTextOption(message, options, "gameId");
    const episodeId = extractTextOption(message, options, "episodeId");
    if (!gameIdRaw || !episodeId) {
      callback?.({
        text: "ARCADE555_MASTERY_VALIDATE requires gameId and episodeId.",
        content: { success: false, error: "missing_payload" },
      });
      return false;
    }

    try {
      getArcade555RuntimeConfig().capabilityGuard?.(
        "ARCADE555_MASTERY_VALIDATE",
        "games.observe",
      );
      const gameId = canonicalizeMasteryGameId(gameIdRaw);
      const episode = await findMasteryEpisodeById({ episodeId, gameId });
      if (!episode) {
        throw new Error(`episode not found: ${episodeId}`);
      }
      const consistency = await readMasteryEpisodeConsistency({
        runId: episode.runId,
        episodeId: episode.episodeId,
      });
      const evidence = await readMasteryEpisodeEvidence({
        runId: episode.runId,
        episodeId: episode.episodeId,
      });
      callback?.({
        text: "Mastery episode validation resolved.",
        content: {
          success: true,
          data: {
            gameId,
            runId: episode.runId,
            episodeId: episode.episodeId,
            status: episode.status,
            verdict: episode.verdict,
            outcome: episode.verdict.outcome,
            consistency,
            evidence,
            qualified: episode.verdict.outcome.finalQualified,
          },
        },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Mastery validation failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "validate ninja episode epi-123" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Validating the mastery episode.",
          action: "ARCADE555_MASTERY_VALIDATE",
        },
      },
    ],
  ] as ActionExample[][],
};

export default masteryValidateAction;
