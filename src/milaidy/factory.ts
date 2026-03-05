import { allActions } from "../actions/index.js";
import {
  describeAgentAuthSource,
  isAgentAuthConfigured,
  resolveAgentBearer,
} from "../lib/transport/agent-auth.js";
import { capabilitiesProvider, stateProvider } from "../providers/index.js";
import { ArcadeControlService } from "../services/ArcadeControlService.js";
import type { Plugin } from "../types/index.js";
import { configureArcade555Runtime } from "./runtime.js";
import type { Arcade555PluginFactoryOptions } from "./types.js";

async function validateCanonicalArcadeEnv(): Promise<void> {
  const baseUrl =
    process.env.ARCADE555_BASE_URL ?? process.env.STREAM555_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "[555arcade] ARCADE555_BASE_URL is required (STREAM555_BASE_URL fallback supported).",
    );
  }
  if (!isAgentAuthConfigured()) {
    throw new Error(
      "[555arcade] Arcade auth is required. Configure ARCADE555_AGENT_API_KEY or ARCADE555_AGENT_TOKEN (STREAM555_* fallback supported).",
    );
  }
  await resolveAgentBearer(baseUrl);
}

export function createArcade555Plugin(
  options: Arcade555PluginFactoryOptions = {},
): Plugin {
  configureArcade555Runtime(options);

  return {
    name: "555arcade",
    description:
      "Unified 555 arcade plugin for games, score telemetry, and progression surfaces.",
    init: async () => {
      await validateCanonicalArcadeEnv();
      console.log(
        `[555arcade] Auth source: ${describeAgentAuthSource()}`,
      );
    },
    services: [ArcadeControlService],
    providers: [stateProvider, capabilitiesProvider],
    actions: allActions,
  };
}
