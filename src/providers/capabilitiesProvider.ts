import { ArcadeControlService } from "../services/ArcadeControlService.js";
import type { IAgentRuntime, Memory, Provider, State } from "../types/index.js";

export const capabilitiesProvider: Provider = {
  name: "arcade555Capabilities",
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<string> => {
    const service = runtime.getService("arcade555") as ArcadeControlService | undefined;
    if (!service) {
      return "Arcade555 capabilities unavailable.";
    }
    const caps = service.getCapabilities();
    return `Arcade555 capabilities: ${JSON.stringify(caps)}`;
  },
};

