import type { IAgentRuntime, Memory, Plugin, State } from "../types/index.js";

export type Arcade555CapabilityGuard = (
  actionName: string,
  capability: string,
) => void;

export type Arcade555TrustedAdminGuard = (
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined,
  actionName: string,
) => void;

export type Arcade555StateDirResolver = () => string;

export interface Arcade555Logger {
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

export interface Arcade555PluginFactoryOptions {
  capabilityGuard?: Arcade555CapabilityGuard;
  trustedAdminGuard?: Arcade555TrustedAdminGuard;
  stateDirResolver?: Arcade555StateDirResolver;
  logger?: Arcade555Logger;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export type Arcade555Plugin = Plugin;
