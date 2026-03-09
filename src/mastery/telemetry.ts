import type { JsonRecord } from "../intelligence/types.js";
import type {
  Arcade555GameTelemetryV2,
  Arcade555TelemetryValidationIssue,
  Arcade555TelemetryValidationResult,
  MasteryLifecycleState,
} from "./types.js";

const LIFECYCLE_STATES = new Set<MasteryLifecycleState>([
  "LOADING",
  "MENU",
  "PLAYING",
  "PAUSED",
  "GAME_OVER",
  "WIN",
  "UNKNOWN",
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pushIssue(
  issues: Arcade555TelemetryValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

function sanitizeJsonRecord(value: unknown): JsonRecord {
  if (!isPlainRecord(value)) return {};
  const out: JsonRecord = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === "string"
      || typeof entry === "number"
      || typeof entry === "boolean"
      || entry === null
    ) {
      out[key] = entry;
      continue;
    }
    if (isPlainRecord(entry)) {
      out[key] = sanitizeJsonRecord(entry);
    }
  }
  return out;
}

function readRequiredRecord(
  source: Record<string, unknown>,
  path: string,
  issues: Arcade555TelemetryValidationIssue[],
): JsonRecord {
  if (!(path in source)) {
    pushIssue(issues, path, "missing_required_field", `${path} is required.`);
    return {};
  }
  const value = source[path];
  if (!isPlainRecord(value)) {
    pushIssue(
      issues,
      path,
      "invalid_record",
      `${path} must be a plain object with JSON-compatible scalar values.`,
    );
    return {};
  }
  return sanitizeJsonRecord(value);
}

function readNullableString(
  source: Record<string, unknown>,
  path: string,
  issues: Arcade555TelemetryValidationIssue[],
): string | null {
  const value = source[path];
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    pushIssue(issues, path, "invalid_string", `${path} must be a string or null.`);
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeLifecycle(
  source: Record<string, unknown>,
  issues: Arcade555TelemetryValidationIssue[],
): MasteryLifecycleState {
  const value = source.lifecycle;
  if (typeof value !== "string") {
    pushIssue(
      issues,
      "lifecycle",
      "invalid_lifecycle",
      "lifecycle must be one of the allowed mastery lifecycle states.",
    );
    return "UNKNOWN";
  }
  const normalized = value.trim().toUpperCase() as MasteryLifecycleState;
  if (!LIFECYCLE_STATES.has(normalized)) {
    pushIssue(
      issues,
      "lifecycle",
      "invalid_lifecycle",
      `Unsupported lifecycle value: ${value}.`,
    );
    return "UNKNOWN";
  }
  return normalized;
}

function normalizeTimestamp(
  source: Record<string, unknown>,
  issues: Arcade555TelemetryValidationIssue[],
  now: () => Date,
): string {
  const value = source.ts;
  if (typeof value !== "string") {
    pushIssue(
      issues,
      "ts",
      "invalid_timestamp_type",
      "ts must be an ISO-8601 string timestamp.",
    );
    return now().toISOString();
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    pushIssue(
      issues,
      "ts",
      "invalid_timestamp",
      "ts must be a parseable ISO-8601 string timestamp.",
    );
    return now().toISOString();
  }
  return new Date(parsed).toISOString();
}

export function validateArcade555GameTelemetryV2(
  value: unknown,
  options?: {
    now?: () => Date;
    expectedGameId?: string | null;
  },
): Arcade555TelemetryValidationResult {
  const issues: Arcade555TelemetryValidationIssue[] = [];
  const now = options?.now ?? (() => new Date());
  const source = isPlainRecord(value) ? value : {};

  if (!isPlainRecord(value)) {
    pushIssue(
      issues,
      "$",
      "invalid_root",
      "telemetry payload must be a plain object.",
    );
  }

  let gameId: string | null = null;
  if (typeof source.gameId === "string" && source.gameId.trim()) {
    gameId = source.gameId.trim();
  } else {
    pushIssue(
      issues,
      "gameId",
      "missing_game_id",
      "gameId must be a non-empty string.",
    );
  }

  if (
    options?.expectedGameId
    && gameId
    && gameId !== options.expectedGameId
  ) {
    pushIssue(
      issues,
      "gameId",
      "unexpected_game_id",
      `telemetry gameId ${gameId} does not match expected gameId ${options.expectedGameId}.`,
    );
  }

  const telemetry: Arcade555GameTelemetryV2 = {
    gameId: gameId ?? options?.expectedGameId ?? null,
    runId: readNullableString(source, "runId", issues),
    episodeId: readNullableString(source, "episodeId", issues),
    ts: normalizeTimestamp(source, issues, now),
    lifecycle: normalizeLifecycle(source, issues),
    nativeMetrics: readRequiredRecord(source, "nativeMetrics", issues),
    objectiveProgress: readRequiredRecord(source, "objectiveProgress", issues),
    failReason: readNullableString(source, "failReason", issues),
    controlCoverage: readRequiredRecord(source, "controlCoverage", issues),
    visualHash: readNullableString(source, "visualHash", issues),
    provenance: readRequiredRecord(source, "provenance", issues),
  };

  return {
    valid: issues.length === 0,
    telemetry,
    issues,
  };
}
