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

function parseBooleanOption(
  message: Memory,
  options: Record<string, unknown> | undefined,
  key: string,
): boolean | undefined {
  const value = options?.[key] ?? message.content?.[key];
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

export const githubListReposAction: Action = {
  name: "ARCADE555_GITHUB_LIST_REPOS",
  description: "List GitHub repositories by owner or authenticated user scope.",
  similes: [
    "GITHUB_LIST_REPOS",
    "LIST_GITHUB_REPOS",
    "SHOW_REPOS",
    "REPOS_LAST_UPDATED",
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

    const owner =
      extractTextOption(message, options, "owner") ||
      extractTextOption(message, options, "org") ||
      extractTextOption(message, options, "username");
    const includePrivate = parseBooleanOption(message, options, "includePrivate");
    const sinceDays = extractNumberOption(message, options, "sinceDays");
    const limit = extractNumberOption(message, options, "limit");

    try {
      const result = await service.githubListRepos({
        owner,
        includePrivate: includePrivate ?? false,
        sinceDays,
        limit,
      });
      callback?.({
        text: "GitHub repositories loaded.",
        content: { success: true, data: result },
      });
      return true;
    } catch (error) {
      callback?.({
        text: `GitHub repo list failed: ${(error as Error).message}`,
        content: { success: false, error: (error as Error).message },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "list repos for Render-Network-OS from last 30 days" },
      },
      {
        user: "{{agentName}}",
        content: { text: "Fetching GitHub repositories.", action: "ARCADE555_GITHUB_LIST_REPOS" },
      },
    ],
  ] as ActionExample[][],
};

export default githubListReposAction;
