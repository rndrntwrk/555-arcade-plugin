import type {
  Action,
  ActionExample,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import {
  readMasteryEpisodeConsistency,
  readMasteryEpisodeEvidence,
  readMasteryRunEvidence,
} from "../mastery/index.js";
import { extractTextOption } from "./shared.js";
import { getArcade555RuntimeConfig } from "../milaidy/runtime.js";

export const masteryEvidenceAction: Action = {
  name: "ARCADE555_MASTERY_EVIDENCE",
  description: "Return mastery evidence timelines for a run or a specific episode.",
  similes: [
    "ARCADE555_GAMES_MASTERY_EVIDENCE",
    "ARCADE_MASTERY_EVIDENCE",
    "GET_ARCADE_MASTERY_EVIDENCE",
  ],
  validate: async (_runtime: IAgentRuntime): Promise<boolean> => true,
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?,
  ): Promise<boolean> => {
    const runId = extractTextOption(message, options, "runId");
    const episodeId = extractTextOption(message, options, "episodeId");
    if (!runId) {
      callback?.({
        text: "ARCADE555_MASTERY_EVIDENCE requires runId.",
        content: { success: false, error: "missing_run_id" },
      });
      return false;
    }

    try {
      getArcade555RuntimeConfig().capabilityGuard?.(
        "ARCADE555_MASTERY_EVIDENCE",
        "games.observe",
      );
      if (episodeId) {
        const evidence = await readMasteryEpisodeEvidence({ runId, episodeId });
        if (!evidence) {
          throw new Error(`episode not found: ${episodeId}`);
        }
        const consistency = await readMasteryEpisodeConsistency({ runId, episodeId });
        callback?.({
          text: "Loaded mastery episode evidence.",
          content: {
            success: true,
            data: {
              runId,
              episodeId,
              evidence,
              consistency,
            },
          },
        });
        return true;
      }

      const evidence = await readMasteryRunEvidence(runId);
      callback?.({
        text: "Loaded mastery run evidence.",
        content: { success: true, data: { runId, evidence } },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `Mastery evidence failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "show mastery evidence for run run-123" },
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Loading mastery evidence.",
          action: "ARCADE555_MASTERY_EVIDENCE",
        },
      },
    ],
  ] as ActionExample[][],
};

export default masteryEvidenceAction;
