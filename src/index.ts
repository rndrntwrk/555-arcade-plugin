import { allActions } from "./actions/index.js";
import { capabilitiesProvider, stateProvider } from "./providers/index.js";
import { ArcadeControlService } from "./services/ArcadeControlService.js";
import type { IAgentRuntime, Plugin } from "./types/index.js";

export const arcade555Plugin: Plugin = {
  name: "555arcade",
  description:
    "Unified 555 arcade plugin for games, score telemetry, and progression surfaces.",
  init: async (_config: unknown, _runtime: IAgentRuntime): Promise<void> => {
    const baseUrl = process.env.ARCADE555_BASE_URL ?? process.env.STREAM555_BASE_URL;
    const token = process.env.ARCADE555_AGENT_TOKEN ?? process.env.STREAM555_AGENT_TOKEN;
    if (!baseUrl || !token) {
      throw new Error(
        "[555arcade] ARCADE555_BASE_URL + ARCADE555_AGENT_TOKEN are required (STREAM555_* fallback supported).",
      );
    }
  },
  services: [ArcadeControlService],
  providers: [stateProvider, capabilitiesProvider],
  actions: allActions,
};

export default arcade555Plugin;

export { ArcadeControlService } from "./services/ArcadeControlService.js";
export * from "./actions/index.js";
export * from "./types/index.js";

