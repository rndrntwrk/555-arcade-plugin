import os from "node:os";
import path from "node:path";
import { resolveUserPath } from "./state-paths.js";
import type { Arcade555PluginFactoryOptions } from "./types.js";

type RuntimeConfig = Required<
  Pick<Arcade555PluginFactoryOptions, "fetchImpl" | "now">
> &
  Pick<
    Arcade555PluginFactoryOptions,
    "capabilityGuard" | "trustedAdminGuard" | "stateDirResolver" | "logger"
  >;

const defaultLogger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const runtimeConfig: RuntimeConfig = {
  fetchImpl: (...args) => fetch(...args),
  now: () => Date.now(),
  logger: defaultLogger,
};

export function configureArcade555Runtime(
  options: Arcade555PluginFactoryOptions = {},
): void {
  if (options.capabilityGuard) {
    runtimeConfig.capabilityGuard = options.capabilityGuard;
  }
  if (options.trustedAdminGuard) {
    runtimeConfig.trustedAdminGuard = options.trustedAdminGuard;
  }
  if (options.stateDirResolver) {
    runtimeConfig.stateDirResolver = options.stateDirResolver;
  }
  if (options.logger) {
    runtimeConfig.logger = {
      ...defaultLogger,
      ...options.logger,
    };
  }
  if (options.fetchImpl) {
    runtimeConfig.fetchImpl = options.fetchImpl;
  }
  if (options.now) {
    runtimeConfig.now = options.now;
  }
}

export function getArcade555RuntimeConfig(): RuntimeConfig {
  return runtimeConfig;
}

export function resolveArcade555StateDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = os.homedir,
): string {
  if (runtimeConfig.stateDirResolver) {
    return resolveUserPath(runtimeConfig.stateDirResolver());
  }

  const override =
    env.MILAIDY_STATE_DIR?.trim() || env.MILADY_STATE_DIR?.trim();
  if (override) {
    return resolveUserPath(override);
  }

  return path.join(homedir(), ".milaidy");
}
