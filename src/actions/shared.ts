import { ArcadeControlService } from "../services/ArcadeControlService.js";
import type { Action, IAgentRuntime, Memory, State } from "../types/index.js";

export function getArcadeService(runtime: IAgentRuntime): ArcadeControlService | null {
  return (runtime.getService("arcade555") as ArcadeControlService | undefined) ?? null;
}

export function extractTextOption(
  message: Memory,
  options: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = options?.[key] ?? message.content?.[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

export function extractStringArrayOption(
  message: Memory,
  options: Record<string, unknown> | undefined,
  key: string,
): string[] | undefined {
  const value = options?.[key] ?? message.content?.[key];
  if (Array.isArray(value)) {
    const normalized = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return normalized.length > 0 ? normalized : undefined;
    }
  } catch {
    // Fall back to comma-separated parsing.
  }
  const normalized = trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

export function extractRecordOption(
  message: Memory,
  options: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined {
  const value = options?.[key] ?? message.content?.[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export function extractNumberOption(
  message: Memory,
  options: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = options?.[key] ?? message.content?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function extractBooleanOption(
  message: Memory,
  options: Record<string, unknown> | undefined,
  key: string,
): boolean | undefined {
  const value = options?.[key] ?? message.content?.[key];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

export function findRuntimeAction(
  runtime: IAgentRuntime,
  actionName: string,
): Action | null {
  const runtimeWithActions = runtime as IAgentRuntime & {
    getAllActions?: () => Action[];
    actions?: Action[];
  };
  const normalized = actionName.trim().toUpperCase();
  const actions = runtimeWithActions.getAllActions?.() ?? runtimeWithActions.actions ?? [];
  for (const action of actions) {
    const name = action.name?.toUpperCase?.() ?? "";
    if (name === normalized) {
      return action;
    }
    const similes = Array.isArray(action.similes) ? action.similes : [];
    if (similes.some((entry) => entry.toUpperCase() === normalized)) {
      return action;
    }
  }
  return null;
}

export async function delegateLegacyAction(
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined,
  actionName: string,
  currentHandler: Action["handler"],
  parameters: Record<string, unknown>,
): Promise<unknown | null> {
  const runtimeWithActions = runtime as IAgentRuntime & {
    getAllActions?: () => Action[];
    actions?: Action[];
  };
  const normalized = actionName.trim().toUpperCase();
  const actions = runtimeWithActions.getAllActions?.() ?? runtimeWithActions.actions ?? [];
  for (const action of actions) {
    const name = action.name?.toUpperCase?.() ?? "";
    const similes = Array.isArray(action.similes) ? action.similes : [];
    const matches =
      name === normalized ||
      similes.some((entry) => entry.toUpperCase() === normalized);
    if (!matches || action.handler === currentHandler) {
      continue;
    }
    return action.handler(runtime, message, state, {
      parameters,
    });
  }
  return null;
}
