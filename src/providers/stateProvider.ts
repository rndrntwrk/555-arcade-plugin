import { ArcadeControlService } from "../services/ArcadeControlService.js";
import type { IAgentRuntime, Memory, Provider, State } from "../types/index.js";

export const stateProvider: Provider = {
  name: "arcade555State",
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<string> => {
    const service = runtime.getService("arcade555") as ArcadeControlService | undefined;
    if (!service) {
      return "Arcade555 service unavailable.";
    }

    const sessionId = service.getBoundSessionId();
    if (!sessionId) {
      return "Arcade555 is initialized but no session is currently bound.";
    }

    try {
      const session = await service.getSession(sessionId);
      return `Arcade555 session ${session.id} active=${String(session.active ?? false)} cfSessionId=${session.cfSessionId ?? "none"}`;
    } catch (error) {
      return `Arcade555 session read failed: ${(error as Error).message}`;
    }
  },
};

