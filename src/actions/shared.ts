import { ArcadeControlService } from "../services/ArcadeControlService.js";
import type { IAgentRuntime, Memory } from "../types/index.js";

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

