import type {
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../types/index.js";
import {
  describeAgentAuthSource,
  invalidateExchangedAgentTokenCache,
  isAgentAuthConfigured,
  resolveAgentBearer,
} from "../lib/transport/agent-auth.js";
import {
  AutonomySupervisor,
  GamePolicyRegistry,
  LearningClient,
  OutcomeAnalyzer,
  PolicyEngine,
  type AgentRequest,
  type LaunchPolicyContext,
} from "../intelligence/index.js";
import { getArcade555RuntimeConfig } from "../milaidy/runtime.js";
import {
  extractBooleanOption,
  extractNumberOption,
  extractRecordOption,
  extractTextOption,
} from "./shared.js";

export type ArcadeGamesDialect = "five55-web" | "milaidy-proxy" | "agent-v1";
export type ArcadeGameSessionMode =
  | "standard"
  | "ranked"
  | "spectate"
  | "solo"
  | "agent";

type AgentBearerSource = string | (() => Promise<string>);

type AgentSessionSnapshot = {
  active: boolean;
  cfSessionId?: string;
};

type AgentStreamStatusSnapshot = {
  active: boolean;
  phase?: string;
  cfSessionId?: string;
  cloudflareConnected: boolean;
  cloudflareState?: string;
};

type CloudflareConnectCheck = {
  connected: boolean;
  lastSnapshot?: AgentStreamStatusSnapshot;
};

type SprintAdSummary = {
  adId: string;
  adName: string;
};

type SprintSlotSnapshot = {
  stage: "checkpoint" | "final";
  at: string;
  status: string;
  policyVersion: number | null;
  score: number | null;
  survivalMs: number | null;
  causeOfDeath: string | null;
};

type SprintIssue = {
  category:
    | "lifecycle"
    | "control"
    | "risk"
    | "resources"
    | "objective"
    | "learning"
    | "ads"
    | "integrity";
  severity: "low" | "medium" | "high";
  symptom: string;
  probableCause: string;
  evidence: string;
  fixHint: string;
};

type SprintSlotResult = {
  sprintId: string;
  slotId: number;
  gameId: string;
  diagnosticRetest: boolean;
  startedAt: string;
  endedAt: string;
  runId: string;
  adId: string;
  adTriggered: boolean;
  adRendered: boolean;
  score: number | null;
  episodeId: string | null;
  policyVersionBefore: number | null;
  policyVersionAfter: number | null;
  compositeScore: number;
  snapshots: SprintSlotSnapshot[];
  issues: SprintIssue[];
};

const API_ENV = "ARCADE555_BASE_URL";
const LEGACY_API_ENV = "FIVE55_GAMES_API_URL";
const DIALECT_ENV = "ARCADE555_GAMES_API_DIALECT";
const LEGACY_DIALECT_ENV = "FIVE55_GAMES_API_DIALECT";
const LOCAL_API_URL_ENV = "MILAIDY_API_URL";
const LOCAL_PORT_ENV = "MILAIDY_PORT";
const STREAM555_BASE_ENV = "STREAM555_BASE_URL";
const STREAM_SESSION_ENV = "STREAM_SESSION_ID";
const STREAM555_SESSION_ENV = "STREAM555_DEFAULT_SESSION_ID";
const DEFAULT_SESSION_ENV = "ARCADE555_DEFAULT_SESSION_ID";
const CF_CONNECT_TIMEOUT_MS_ENV = "ARCADE555_CF_CONNECT_TIMEOUT_MS";
const LEGACY_CF_CONNECT_TIMEOUT_MS_ENV = "FIVE55_GAMES_CF_CONNECT_TIMEOUT_MS";
const CF_CONNECT_POLL_MS_ENV = "ARCADE555_CF_CONNECT_POLL_MS";
const LEGACY_CF_CONNECT_POLL_MS_ENV = "FIVE55_GAMES_CF_CONNECT_POLL_MS";
const CF_RECOVERY_ATTEMPTS_ENV = "ARCADE555_CF_RECOVERY_ATTEMPTS";
const LEGACY_CF_RECOVERY_ATTEMPTS_ENV = "FIVE55_GAMES_CF_RECOVERY_ATTEMPTS";
const ALICE_INTELLIGENCE_ENABLED_ENV = "ALICE_INTELLIGENCE_ENABLED";
const ALICE_LEARNING_WRITEBACK_ENABLED_ENV =
  "ALICE_LEARNING_WRITEBACK_ENABLED";
const SPRINT_SLOT_SECONDS_ENV = "ARCADE555_SPRINT_SLOT_SECONDS";
const LEGACY_SPRINT_SLOT_SECONDS_ENV = "FIVE55_GAMES_SPRINT_SLOT_SECONDS";
const SPRINT_AD_OFFSET_SECONDS_ENV = "ARCADE555_SPRINT_AD_OFFSET_SECONDS";
const LEGACY_SPRINT_AD_OFFSET_SECONDS_ENV = "FIVE55_GAMES_SPRINT_AD_OFFSET_SECONDS";

const DEFAULT_CF_CONNECT_TIMEOUT_MS = 45_000;
const DEFAULT_CF_CONNECT_POLL_MS = 5_000;
const DEFAULT_CF_RECOVERY_ATTEMPTS = 1;
const DEFAULT_SPRINT_SLOT_SECONDS = 5 * 60;
const DEFAULT_SPRINT_AD_OFFSET_SECONDS = 4 * 60 + 30;
const DEFAULT_SPRINT_AD_RETRY_OFFSET_SECONDS = 4 * 60 + 55;
const DEFAULT_SPRINT_SLOT_CHECKPOINTS_SECONDS = [15, 60, 150];
const DEFAULT_SPRINT_LEARNING_BACKFILL_WAIT_MS = 12_000;
const DEFAULT_SPRINT_LEARNING_BACKFILL_POLL_MS = 2_000;
const SPRINT_DIAGNOSTIC_SLOTS = 2;
const SPRINT_EXPECTED_GAME_COUNT = 16;
const LEGACY_REMOVAL_RELEASE = "Release C";

const SPRINT_GAME_ORDER = [
  "knighthood",
  "sector-13",
  "ninja",
  "clawstrike",
  "555drive",
  "chesspursuit",
  "wolf-and-sheep",
  "leftandright",
  "playback",
  "fighter-planes",
  "floor13",
  "godai-is-back",
  "peanball",
  "eat-my-dust",
  "where-were-going-we-do-need-roads",
  "vedas-run",
] as const;

let cachedAgentSessionId: string | undefined;

function trimEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function readFirstEnv(keys: string[], fallback?: string): string | undefined {
  for (const key of keys) {
    const value = trimEnv(key);
    if (value) return value;
  }
  return fallback;
}

function readPositiveIntEnv(keys: string[], fallback: number): number {
  const raw = readFirstEnv(keys);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function readBooleanEnv(key: string, fallback: boolean): boolean {
  const raw = trimEnv(key);
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function readNonNegativeIntEnv(keys: string[], fallback: number): number {
  const raw = readFirstEnv(keys);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
}

function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeMode(
  mode: string | undefined,
  dialect: ArcadeGamesDialect,
): ArcadeGameSessionMode {
  const normalized = mode?.trim().toLowerCase();
  if (
    normalized === "standard" ||
    normalized === "ranked" ||
    normalized === "spectate" ||
    normalized === "solo" ||
    normalized === "agent"
  ) {
    return normalized;
  }
  if (
    normalized === "autonomous" ||
    normalized === "auto" ||
    normalized === "bot" ||
    normalized === "play"
  ) {
    return "agent";
  }
  return dialect === "agent-v1" ? "agent" : "spectate";
}

export function resolveArcadeGamesDialect(): ArcadeGamesDialect {
  const explicit =
    readFirstEnv([DIALECT_ENV, LEGACY_DIALECT_ENV])?.toLowerCase() ?? "";
  if (explicit === "five55-web" || explicit === "web") return "five55-web";
  if (explicit === "agent-v1" || explicit === "agent") return "agent-v1";
  if (explicit === "milaidy-proxy" || explicit === "proxy") {
    return "milaidy-proxy";
  }
  if (trimEnv(STREAM555_BASE_ENV) && isAgentAuthConfigured()) {
    return "agent-v1";
  }
  return readFirstEnv([API_ENV, LEGACY_API_ENV]) ? "five55-web" : "milaidy-proxy";
}

export function resolveArcadeGamesBase(dialect: ArcadeGamesDialect): string {
  if (dialect === "five55-web") {
    const base = readFirstEnv([API_ENV, LEGACY_API_ENV]);
    if (!base) throw new Error(`${API_ENV} is not configured`);
    return base;
  }

  if (dialect === "agent-v1") {
    const base = trimEnv(STREAM555_BASE_ENV) ?? readFirstEnv([API_ENV]);
    if (!base) throw new Error(`${STREAM555_BASE_ENV} is not configured`);
    return base;
  }

  const localBase = trimEnv(LOCAL_API_URL_ENV);
  if (localBase) return localBase;
  const localPort = trimEnv(LOCAL_PORT_ENV) ?? "2138";
  return `http://127.0.0.1:${localPort}`;
}

export function resolveCatalogEndpoint(
  dialect: ArcadeGamesDialect,
  sessionId?: string,
): string {
  if (dialect === "agent-v1") {
    if (!sessionId) throw new Error("sessionId is required for agent-v1 games catalog");
    return `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/games/catalog`;
  }
  return dialect === "five55-web"
    ? "/api/games/catalog"
    : "/api/arcade555/games/catalog";
}

export function resolvePlayEndpoint(
  dialect: ArcadeGamesDialect,
  sessionId?: string,
): string {
  if (dialect === "agent-v1") {
    if (!sessionId) throw new Error("sessionId is required for agent-v1 game play");
    return `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/games/play`;
  }
  return dialect === "five55-web" ? "/api/games/play" : "/api/arcade555/games/play";
}

export function resolveSwitchEndpoint(
  dialect: ArcadeGamesDialect,
  sessionId?: string,
): string {
  if (dialect !== "agent-v1") {
    return "/api/arcade555/games/switch";
  }
  if (!sessionId) throw new Error("sessionId is required for agent-v1 game switch");
  return `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/games/switch`;
}

export function resolveStopEndpoint(
  dialect: ArcadeGamesDialect,
  sessionId?: string,
): string {
  if (dialect !== "agent-v1") {
    return "/api/arcade555/games/stop";
  }
  if (!sessionId) throw new Error("sessionId is required for agent-v1 game stop");
  return `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/games/stop`;
}

function resolveAdsListEndpoint(
  dialect: ArcadeGamesDialect,
  sessionId?: string,
): string {
  if (dialect !== "agent-v1") {
    throw new Error("ads list endpoint requires agent-v1 dialect");
  }
  if (!sessionId) throw new Error("sessionId is required for agent-v1 ads list");
  return `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/ads`;
}

function resolveAdTriggerEndpoint(
  dialect: ArcadeGamesDialect,
  sessionId: string,
  adId: string,
): string {
  if (dialect !== "agent-v1") {
    throw new Error("ads trigger endpoint requires agent-v1 dialect");
  }
  return `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/ads/${encodeURIComponent(adId)}/trigger`;
}

function resolveAdActiveEndpoint(
  dialect: ArcadeGamesDialect,
  sessionId: string,
): string {
  if (dialect !== "agent-v1") {
    throw new Error("ads active endpoint requires agent-v1 dialect");
  }
  return `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/ads/active`;
}

function parseCallbackPayload(
  callbackPayload: { text: string; content?: Record<string, unknown> } | null,
): { success: boolean; data?: Record<string, unknown>; error?: string } {
  if (!callbackPayload) return { success: false, error: "missing_callback_payload" };
  const content = callbackPayload.content ?? {};
  return {
    success: content.success !== false,
    data: asRecord(content.data) ?? content,
    error:
      typeof content.error === "string"
        ? content.error
        : content.success === false
          ? callbackPayload.text
          : undefined,
  };
}

function assertCapability(actionName: string, capability: string): void {
  getArcade555RuntimeConfig().capabilityGuard?.(actionName, capability);
}

function assertTrustedAdmin(
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined,
  actionName: string,
): void {
  getArcade555RuntimeConfig().trustedAdminGuard?.(
    runtime,
    message,
    state,
    actionName,
  );
}

function resolveOptionalBearer(
  dialect: ArcadeGamesDialect,
): AgentBearerSource | undefined {
  if (dialect === "milaidy-proxy") {
    const localToken = trimEnv("MILAIDY_API_TOKEN");
    return localToken || undefined;
  }
  return undefined;
}

async function fetchJson(
  method: "GET" | "POST" | "PUT",
  base: string,
  endpoint: string,
  token?: AgentBearerSource,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data?: Record<string, unknown>; rawBody: string }> {
  const target = new URL(endpoint, base);
  const runtimeConfig = getArcade555RuntimeConfig();
  const resolveToken = async (): Promise<string | undefined> =>
    typeof token === "function" ? await token() : token;

  const executeWithToken = async (
    bearerToken?: string,
  ): Promise<{
    ok: boolean;
    status: number;
    data?: Record<string, unknown>;
    rawBody: string;
  }> => {
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (bearerToken) {
      (init.headers as Record<string, string>).Authorization = `Bearer ${bearerToken}`;
    }
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await runtimeConfig.fetchImpl(target, init);
    const rawBody = await response.text();
    let data: Record<string, unknown> | undefined;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      // non-JSON response
    }
    return {
      ok: response.ok,
      status: response.status,
      data,
      rawBody,
    };
  };

  let bearerToken = token ? await resolveToken() : "";
  let result = await executeWithToken(bearerToken);
  if (result.status === 401 && typeof token === "function") {
    invalidateExchangedAgentTokenCache();
    bearerToken = await resolveToken();
    result = await executeWithToken(bearerToken);
  }
  return result;
}

function createAgentRequest(base: string, token: AgentBearerSource): AgentRequest {
  return (method, endpoint, body) => fetchJson(method, base, endpoint, token, body);
}

function getErrorDetail(payload: {
  data?: Record<string, unknown>;
  rawBody: string;
}): string {
  const fromData = payload.data?.error;
  if (typeof fromData === "string" && fromData.trim()) return fromData;
  return payload.rawBody || "upstream request failed";
}

function resolveCatalogGameId(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;
  const games = Array.isArray(data.games) ? data.games : [];
  for (const game of games) {
    const gameRecord = asRecord(game);
    const gameId = typeof gameRecord?.id === "string" ? gameRecord.id.trim() : "";
    if (gameId.length > 0) return gameId;
  }
  return undefined;
}

export async function resolveAgentGameId(
  base: string,
  token: string,
  sessionId: string,
  requestedGameId?: string,
): Promise<string | undefined> {
  const preferred = requestedGameId?.trim();
  if (preferred) return preferred;

  const catalog = await fetchJson(
    "POST",
    base,
    resolveCatalogEndpoint("agent-v1", sessionId),
    token,
    { includeBeta: true },
  );
  if (!catalog.ok) return undefined;
  return resolveCatalogGameId(catalog.data);
}

export async function ensureAgentSessionId(
  base: string,
  token: string,
  requestedSessionId?: string,
): Promise<string> {
  const preferredSessionId =
    requestedSessionId?.trim() ||
    cachedAgentSessionId ||
    trimEnv(STREAM_SESSION_ENV) ||
    trimEnv(DEFAULT_SESSION_ENV) ||
    trimEnv(STREAM555_SESSION_ENV);

  const body =
    preferredSessionId && preferredSessionId.length > 0
      ? { sessionId: preferredSessionId }
      : {};
  const response = await fetchJson("POST", base, "/api/agent/v1/sessions", token, body);

  if (!response.ok) {
    throw new Error(
      `session bootstrap failed (${response.status}): ${getErrorDetail(response)}`,
    );
  }

  const sessionId =
    readNonEmptyString(response.data?.sessionId) ??
    readNonEmptyString(response.data?.id);
  if (!sessionId) {
    throw new Error("session bootstrap did not return sessionId");
  }
  cachedAgentSessionId = sessionId;
  return sessionId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseIsoMs(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function waitUntil(startMs: number, targetOffsetSeconds: number): Promise<void> {
  const targetMs = startMs + targetOffsetSeconds * 1000;
  const remaining = targetMs - Date.now();
  if (remaining <= 0) return Promise.resolve();
  return sleep(remaining);
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchAgentSessionSnapshot(
  base: string,
  token: string,
  sessionId: string,
): Promise<AgentSessionSnapshot> {
  const response = await fetchJson(
    "GET",
    base,
    `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}`,
    token,
  );
  if (!response.ok) {
    throw new Error(
      `session status preflight failed (${response.status}): ${getErrorDetail(response)}`,
    );
  }
  return {
    active: Boolean(response.data?.active),
    cfSessionId: readNonEmptyString(response.data?.cfSessionId),
  };
}

async function stopAgentStream(
  base: string,
  token: string,
  sessionId: string,
  options?: { allowMissing?: boolean },
): Promise<void> {
  const response = await fetchJson(
    "POST",
    base,
    `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/stream/stop`,
    token,
    {},
  );
  if (
    !response.ok &&
    !(
      options?.allowMissing &&
      (response.status === 404 || response.status === 409)
    )
  ) {
    throw new Error(
      `stream/stop failed (${response.status}): ${getErrorDetail(response)}`,
    );
  }
}

async function startAgentScreenStream(
  base: string,
  token: string,
  sessionId: string,
): Promise<string | undefined> {
  const response = await fetchJson(
    "POST",
    base,
    `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/stream/start`,
    token,
    {
      input: {
        type: "screen",
      },
    },
  );

  const cfSessionId = readNonEmptyString(response.data?.cfSessionId);
  if (!response.ok && !(response.status === 409 && cfSessionId)) {
    throw new Error(
      `stream/start provisioning failed (${response.status}): ${getErrorDetail(response)}`,
    );
  }

  return cfSessionId;
}

export async function ensureAgentCloudflareOutput(
  base: string,
  token: string,
  sessionId: string,
): Promise<void> {
  const snapshot = await fetchAgentSessionSnapshot(base, token, sessionId);
  if (snapshot.cfSessionId) return;

  if (snapshot.active) {
    await stopAgentStream(base, token, sessionId);
  }

  const startedCfSessionId = await startAgentScreenStream(base, token, sessionId);
  if (startedCfSessionId) return;

  const verifiedSnapshot = await fetchAgentSessionSnapshot(base, token, sessionId);
  if (verifiedSnapshot.cfSessionId) return;

  throw new Error(
    "Cloudflare output provisioning did not produce cfSessionId for session",
  );
}

async function fetchAgentStreamStatusSnapshot(
  base: string,
  token: string,
  sessionId: string,
): Promise<AgentStreamStatusSnapshot> {
  const response = await fetchJson(
    "GET",
    base,
    `/api/agent/v1/sessions/${encodeURIComponent(sessionId)}/stream/status`,
    token,
  );
  if (!response.ok) {
    throw new Error(
      `stream status check failed (${response.status}): ${getErrorDetail(response)}`,
    );
  }

  const cloudflare = asRecord(response.data?.cloudflare);
  return {
    active: Boolean(response.data?.active),
    phase: readNonEmptyString(response.data?.phase),
    cfSessionId: readNonEmptyString(response.data?.cfSessionId),
    cloudflareConnected: Boolean(cloudflare?.isConnected),
    cloudflareState: readNonEmptyString(cloudflare?.state),
  };
}

async function waitForAgentCloudflareConnection(
  base: string,
  token: string,
  sessionId: string,
  timeoutMs: number,
  pollMs: number,
): Promise<CloudflareConnectCheck> {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot: AgentStreamStatusSnapshot | undefined;

  while (Date.now() <= deadline) {
    lastSnapshot = await fetchAgentStreamStatusSnapshot(base, token, sessionId);
    if (lastSnapshot.cloudflareConnected) {
      return { connected: true, lastSnapshot };
    }

    if (Date.now() >= deadline) break;
    await sleep(pollMs);
  }

  return {
    connected: false,
    lastSnapshot,
  };
}

async function prepareLaunchPolicyContext(
  base: string,
  token: AgentBearerSource,
  sessionId: string,
  gameId: string,
): Promise<LaunchPolicyContext | null> {
  const intelligenceEnabled = readBooleanEnv(ALICE_INTELLIGENCE_ENABLED_ENV, true);
  if (!intelligenceEnabled) return null;

  const learningWritebackEnabled = readBooleanEnv(
    ALICE_LEARNING_WRITEBACK_ENABLED_ENV,
    true,
  );

  const request = createAgentRequest(base, token);
  const policyRegistry = new GamePolicyRegistry();
  const supervisor = new AutonomySupervisor({
    learningClient: new LearningClient(request),
    policyEngine: new PolicyEngine(policyRegistry),
    outcomeAnalyzer: new OutcomeAnalyzer(policyRegistry),
    learningWritebackEnabled,
  });

  return supervisor.prepareLaunchContext(sessionId, gameId);
}

function isEpisodeFreshForSlot(
  episode: Awaited<ReturnType<LearningClient["fetchSessionLearning"]>>["latestEpisode"],
  slotStartedMs: number,
): boolean {
  if (!episode?.id) return false;
  const episodeCreatedMs = parseIsoMs(episode.createdAt);
  if (episodeCreatedMs == null) return true;
  return episodeCreatedMs >= slotStartedMs - 1_000;
}

async function fetchSlotFinalLearningSnapshot(
  learningClient: LearningClient,
  sessionId: string,
  gameId: string,
  slotStartedMs: number,
): Promise<Awaited<ReturnType<LearningClient["fetchSessionLearning"]>>> {
  let snapshot = await learningClient.fetchSessionLearning(sessionId, gameId);
  if (isEpisodeFreshForSlot(snapshot.latestEpisode, slotStartedMs)) {
    return snapshot;
  }

  const deadline = Date.now() + DEFAULT_SPRINT_LEARNING_BACKFILL_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(DEFAULT_SPRINT_LEARNING_BACKFILL_POLL_MS);
    snapshot = await learningClient.fetchSessionLearning(sessionId, gameId);
    if (isEpisodeFreshForSlot(snapshot.latestEpisode, slotStartedMs)) {
      break;
    }
  }

  return snapshot;
}

function asSprintSlotSnapshot(
  stage: "checkpoint" | "final",
  snapshot: Awaited<ReturnType<LearningClient["fetchSessionLearning"]>>,
): SprintSlotSnapshot {
  const episode = snapshot.latestEpisode ?? null;
  return {
    stage,
    at: new Date().toISOString(),
    status:
      episode?.causeOfDeath && episode.causeOfDeath.length > 0
        ? "GAME_OVER"
        : "PLAYING",
    policyVersion: snapshot.profile.policyVersion ?? null,
    score: toFiniteNumber(episode?.score),
    survivalMs: toFiniteNumber(episode?.survivalMs),
    causeOfDeath: episode?.causeOfDeath ?? null,
  };
}

function computeCompositeScore(slot: SprintSlotResult): number {
  const survival =
    slot.score != null && slot.score > 0
      ? Math.min(100, slot.score / 10)
      : slot.snapshots.some((entry) => entry.status === "PLAYING")
        ? 60
        : 20;
  const avoidableFailure = slot.snapshots.some((entry) => {
    const cause = entry.causeOfDeath?.toLowerCase() ?? "";
    return cause.includes("spike") || cause.includes("gap");
  })
    ? 30
    : 90;
  const controlEfficiency = slot.snapshots.some((entry) => entry.status === "PLAYING")
    ? 75
    : 40;
  const policyResponsive =
    slot.policyVersionAfter != null &&
    slot.policyVersionBefore != null &&
    slot.policyVersionAfter > slot.policyVersionBefore
      ? 85
      : 55;

  const weighted =
    survival * 0.4 +
    avoidableFailure * 0.25 +
    controlEfficiency * 0.2 +
    policyResponsive * 0.15;
  return Number(weighted.toFixed(2));
}

function buildSlotIssues(slot: SprintSlotResult): SprintIssue[] {
  const issues: SprintIssue[] = [];

  if (!slot.adTriggered || !slot.adRendered) {
    issues.push({
      category: "ads",
      severity: "high",
      symptom: "Ad trigger or render did not complete within slot window",
      probableCause: "Cooldown gating, missing ad inventory, or trigger API failure",
      evidence: `adTriggered=${slot.adTriggered}; adRendered=${slot.adRendered}`,
      fixHint: "Verify ad inventory, cooldown timing, and re-trigger near slot close",
    });
  }

  if (!slot.episodeId) {
    issues.push({
      category: "learning",
      severity: "high",
      symptom: "Episode summary was not persisted",
      probableCause: "Learning ingest auth missing or ingest endpoint failure",
      evidence: "latestEpisode.id not returned at final snapshot",
      fixHint: "Verify agent auth token passthrough and /episodes/complete route health",
    });
  }

  if (
    slot.policyVersionBefore != null &&
    slot.policyVersionAfter != null &&
    slot.policyVersionAfter < slot.policyVersionBefore
  ) {
    issues.push({
      category: "learning",
      severity: "medium",
      symptom: "Policy version regressed after slot completion",
      probableCause: "Profile write race or stale policy overwrite",
      evidence: `before=${slot.policyVersionBefore}; after=${slot.policyVersionAfter}`,
      fixHint: "Audit policy write ordering and idempotency guards",
    });
  }

  const deadlySnapshot = slot.snapshots.find(
    (entry) =>
      entry.causeOfDeath?.toLowerCase().includes("spike") ||
      entry.causeOfDeath?.toLowerCase().includes("gap"),
  );
  if (deadlySnapshot) {
    issues.push({
      category: "risk",
      severity: "high",
      symptom: "Avoidable hazard death pattern persists",
      probableCause: "Hazard prioritization and landing checks not conservative enough",
      evidence: `causeOfDeath=${deadlySnapshot.causeOfDeath}`,
      fixHint: "Increase spike/gap threat weighting and recenter aggressiveness",
    });
  }

  if (slot.score == null || slot.score <= 0) {
    issues.push({
      category: "objective",
      severity: "medium",
      symptom: "No meaningful score progression observed",
      probableCause: "Lifecycle stalls, rapid deaths, or inactive input loops",
      evidence: "final slot score was null/zero",
      fixHint: "Audit menu/pause transitions and first-action latency",
    });
  }

  return issues;
}

function selectDiagnosticRetests(
  slots: SprintSlotResult[],
  count: number,
): Array<{ gameId: string; sourceSlotId: number }> {
  const eligible = slots
    .filter((slot) => !slot.diagnosticRetest)
    .slice()
    .sort((a, b) => a.compositeScore - b.compositeScore);

  const selections: Array<{ gameId: string; sourceSlotId: number }> = [];
  for (const candidate of eligible) {
    if (selections.some((entry) => entry.gameId === candidate.gameId)) continue;
    selections.push({
      gameId: candidate.gameId,
      sourceSlotId: candidate.slotId,
    });
    if (selections.length >= count) break;
  }
  return selections;
}

async function fetchSprintCatalogGameIds(
  base: string,
  token: AgentBearerSource,
  sessionId: string,
): Promise<Set<string>> {
  const response = await fetchJson(
    "POST",
    base,
    resolveCatalogEndpoint("agent-v1", sessionId),
    token,
    { includeBeta: true },
  );
  if (!response.ok) {
    throw new Error(
      `games catalog preflight failed (${response.status}): ${getErrorDetail(response)}`,
    );
  }
  const games = asRecordArray(response.data?.games);
  return new Set(
    games
      .map((entry) => readNonEmptyString(entry.id)?.toLowerCase())
      .filter((entry): entry is string => Boolean(entry)),
  );
}

function resolveSprintGameOrder(availableGames: Set<string>): string[] {
  const ordered = SPRINT_GAME_ORDER.filter((gameId) => availableGames.has(gameId));
  if (ordered.length < SPRINT_EXPECTED_GAME_COUNT) {
    const missing = SPRINT_GAME_ORDER.filter((gameId) => !availableGames.has(gameId));
    throw new Error(
      `catalog missing required sprint games (${SPRINT_EXPECTED_GAME_COUNT - ordered.length} missing): ${missing.join(", ")}`,
    );
  }
  return ordered.slice(0, SPRINT_EXPECTED_GAME_COUNT);
}

async function fetchSprintAds(
  base: string,
  token: AgentBearerSource,
  sessionId: string,
): Promise<SprintAdSummary[]> {
  const response = await fetchJson(
    "GET",
    base,
    resolveAdsListEndpoint("agent-v1", sessionId),
    token,
  );
  if (!response.ok) {
    throw new Error(
      `ads inventory preflight failed (${response.status}): ${getErrorDetail(response)}`,
    );
  }
  const ads = asRecordArray(response.data?.ads)
    .map((entry) => {
      const adId = readNonEmptyString(entry.id);
      if (!adId) return null;
      const adName =
        readNonEmptyString(entry.name) ?? readNonEmptyString(entry.title) ?? adId;
      return { adId, adName };
    })
    .filter((entry): entry is SprintAdSummary => Boolean(entry));

  if (ads.length < 6) {
    throw new Error(
      `ads inventory preflight failed: expected at least 6 default creatives, found ${ads.length}`,
    );
  }
  return ads.slice(0, 6);
}

async function triggerSprintAd(
  base: string,
  token: AgentBearerSource,
  sessionId: string,
  adId: string,
): Promise<{ triggered: boolean; rendered: boolean; detail?: string }> {
  const response = await fetchJson(
    "POST",
    base,
    resolveAdTriggerEndpoint("agent-v1", sessionId, adId),
    token,
    {},
  );
  if (!response.ok) {
    return {
      triggered: false,
      rendered: false,
      detail: `ad trigger failed (${response.status}): ${getErrorDetail(response)}`,
    };
  }

  const expectedGraphicId = readNonEmptyString(asRecord(response.data?.graphic)?.id);
  const timeoutMs = 9_000;
  const pollMs = 600;
  const startedAt = Date.now();
  let lastObservedDetail = "render acknowledgement pending";

  while (Date.now() - startedAt < timeoutMs) {
    const activeResponse = await fetchJson(
      "GET",
      base,
      resolveAdActiveEndpoint("agent-v1", sessionId),
      token,
    );
    if (!activeResponse.ok) {
      lastObservedDetail = `active ad lookup failed (${activeResponse.status}): ${getErrorDetail(activeResponse)}`;
      await sleep(pollMs);
      continue;
    }

    const active = asRecord(activeResponse.data?.active);
    const activeAdId = readNonEmptyString(active?.adId);
    const activeGraphicId = readNonEmptyString(active?.graphicId);
    const renderAcked = active?.renderAcked === true;

    if (!active) {
      lastObservedDetail = "ad became inactive before render acknowledgement";
      await sleep(pollMs);
      continue;
    }

    if (activeAdId !== adId) {
      lastObservedDetail = `active ad mismatch (expected ${adId}, saw ${activeAdId ?? "none"})`;
      await sleep(pollMs);
      continue;
    }

    if (expectedGraphicId && activeGraphicId && activeGraphicId !== expectedGraphicId) {
      lastObservedDetail = `graphic mismatch (expected ${expectedGraphicId}, saw ${activeGraphicId})`;
      await sleep(pollMs);
      continue;
    }

    if (renderAcked) {
      return { triggered: true, rendered: true };
    }

    lastObservedDetail = "render acknowledgement pending";
    await sleep(pollMs);
  }

  return {
    triggered: true,
    rendered: false,
    detail: lastObservedDetail,
  };
}

function success(
  callback: HandlerCallback | undefined,
  text: string,
  data: Record<string, unknown>,
): boolean {
  callback?.({ text, content: { success: true, data } });
  return true;
}

function failure(
  callback: HandlerCallback | undefined,
  text: string,
  error: string,
  extra?: Record<string, unknown>,
): boolean {
  callback?.({ text, content: { success: false, error, ...extra } });
  return false;
}

export async function runArcadeGamesCatalog(
  runtime: IAgentRuntime,
  message: Memory,
  _state: State | undefined,
  options: Record<string, unknown> | undefined,
  callback?: HandlerCallback,
): Promise<boolean> {
  try {
    assertCapability("ARCADE555_GAMES_CATALOG", "games.observe");
    const dialect = resolveArcadeGamesDialect();
    const filter = extractTextOption(message, options, "filter");
    const includeBeta =
      extractBooleanOption(message, options, "includeBeta") ?? true;
    const requestedSessionId = extractTextOption(message, options, "sessionId");
    const category = filter && filter !== "all" ? filter : undefined;

    if (dialect === "agent-v1") {
      const base = resolveArcadeGamesBase(dialect);
      const token = await resolveAgentBearer(base);
      const sessionId = await ensureAgentSessionId(base, token, requestedSessionId);
      const catalog = await fetchJson(
        "POST",
        base,
        resolveCatalogEndpoint(dialect, sessionId),
        token,
        {
          ...(category ? { category } : {}),
          includeBeta,
        },
      );
      if (!catalog.ok) {
        return failure(
          callback,
          "Arcade catalog request failed.",
          getErrorDetail(catalog),
          { status: catalog.status },
        );
      }
      return success(callback, "Arcade catalog loaded.", {
        ...(catalog.data ?? {}),
        sessionId,
        dialect,
      });
    }

    const base = resolveArcadeGamesBase(dialect);
    const tokenProvider = resolveOptionalBearer(dialect);
    const catalog = await fetchJson(
      "POST",
      base,
      resolveCatalogEndpoint(dialect),
      tokenProvider,
      {
        ...(category ? { category } : {}),
        includeBeta,
      },
    );
    if (!catalog.ok) {
      return failure(
        callback,
        "Arcade catalog request failed.",
        getErrorDetail(catalog),
        { status: catalog.status },
      );
    }
    return success(callback, "Arcade catalog loaded.", {
      ...(catalog.data ?? {}),
      dialect,
    });
  } catch (error) {
    return failure(
      callback,
      `Catalog request failed: ${(error as Error).message}`,
      (error as Error).message,
    );
  }
}

export async function runArcadeGamesPlay(
  runtime: IAgentRuntime,
  message: Memory,
  _state: State | undefined,
  options: Record<string, unknown> | undefined,
  callback?: HandlerCallback,
): Promise<boolean> {
  try {
    assertCapability("ARCADE555_GAMES_PLAY", "games.play");
    const dialect = resolveArcadeGamesDialect();
    const gameId = extractTextOption(message, options, "gameId");
    const mode = normalizeMode(extractTextOption(message, options, "mode"), dialect);
    const masteryProfile = extractRecordOption(message, options, "masteryProfile");
    const evidenceMode = extractTextOption(message, options, "evidenceMode");
    const requestedSessionId = extractTextOption(message, options, "sessionId");
    const quickActions = options && Array.isArray(options.quickActions)
      ? (options.quickActions as string[])
      : undefined;

    if (dialect === "agent-v1") {
      const base = resolveArcadeGamesBase(dialect);
      const token = await resolveAgentBearer(base);
      const sessionId = await ensureAgentSessionId(base, token, requestedSessionId);
      const resolvedGameId = await resolveAgentGameId(base, token, sessionId, gameId);
      const response = await fetchJson(
        "POST",
        base,
        resolvePlayEndpoint(dialect, sessionId),
        token,
        {
          ...(resolvedGameId ? { gameId: resolvedGameId } : {}),
          mode,
          ...(quickActions ? { quickActions } : {}),
          ...(masteryProfile ? { masteryProfile } : {}),
          ...(evidenceMode ? { evidenceMode } : {}),
        },
      );
      if (!response.ok) {
        return failure(
          callback,
          "Arcade game launch failed.",
          getErrorDetail(response),
          { status: response.status, sessionId },
        );
      }
      return success(callback, `Arcade game launch requested: ${resolvedGameId ?? gameId ?? "auto"}.`, {
        ...(response.data ?? {}),
        sessionId,
        gameId: resolvedGameId ?? gameId ?? null,
        mode,
      });
    }

    const base = resolveArcadeGamesBase(dialect);
    const tokenProvider = resolveOptionalBearer(dialect);
    const response = await fetchJson(
      "POST",
      base,
      resolvePlayEndpoint(dialect),
      tokenProvider,
      {
        ...(gameId ? { gameId } : {}),
        mode,
        ...(quickActions ? { quickActions } : {}),
        ...(masteryProfile ? { masteryProfile } : {}),
        ...(evidenceMode ? { evidenceMode } : {}),
      },
    );
    if (!response.ok) {
      return failure(
        callback,
        "Arcade game launch failed.",
        getErrorDetail(response),
        { status: response.status },
      );
    }
    return success(callback, `Arcade game launch requested: ${gameId ?? "auto"}.`, {
      ...(response.data ?? {}),
      gameId: gameId ?? null,
      mode,
    });
  } catch (error) {
    return failure(
      callback,
      `Game launch failed: ${(error as Error).message}`,
      (error as Error).message,
    );
  }
}

export async function runArcadeGamesSwitch(
  runtime: IAgentRuntime,
  message: Memory,
  _state: State | undefined,
  options: Record<string, unknown> | undefined,
  callback?: HandlerCallback,
): Promise<boolean> {
  try {
    assertCapability("ARCADE555_GAMES_SWITCH", "games.play");
    const dialect = resolveArcadeGamesDialect();
    const requestedGameId = extractTextOption(message, options, "gameId");
    const requestedSessionId = extractTextOption(message, options, "sessionId");
    const mode = normalizeMode(extractTextOption(message, options, "mode"), dialect);
    const masteryProfile = extractRecordOption(message, options, "masteryProfile");
    const quickActions = options && Array.isArray(options.quickActions)
      ? (options.quickActions as string[])
      : undefined;

    if (dialect !== "agent-v1") {
      return runArcadeGamesPlay(runtime, message, _state, options, callback);
    }

    const base = resolveArcadeGamesBase(dialect);
    const token = await resolveAgentBearer(base);
    const sessionId = await ensureAgentSessionId(base, token, requestedSessionId);
    const gameId = await resolveAgentGameId(base, token, sessionId, requestedGameId);
    if (!gameId) {
      return failure(
        callback,
        "Game switch failed: no playable game resolved.",
        "missing_game_id",
      );
    }

    const response = await fetchJson(
      "POST",
      base,
      resolveSwitchEndpoint(dialect, sessionId),
      token,
      {
        gameId,
        mode,
        ...(quickActions ? { quickActions } : {}),
        ...(masteryProfile ? { masteryProfile } : {}),
      },
    );
    if (!response.ok) {
      if (response.status === 404) {
        return runArcadeGamesPlay(
          runtime,
          message,
          _state,
          {
            ...options,
            gameId,
            sessionId,
            mode,
          },
          callback,
        );
      }
      return failure(
        callback,
        "Game switch failed.",
        getErrorDetail(response),
        { status: response.status, sessionId },
      );
    }

    return success(callback, `Arcade switched to ${gameId}.`, {
      ...(response.data ?? {}),
      sessionId,
      gameId,
      mode,
    });
  } catch (error) {
    return failure(
      callback,
      `Game switch failed: ${(error as Error).message}`,
      (error as Error).message,
    );
  }
}

export async function runArcadeGamesStop(
  _runtime: IAgentRuntime,
  message: Memory,
  _state: State | undefined,
  options: Record<string, unknown> | undefined,
  callback?: HandlerCallback,
): Promise<boolean> {
  try {
    assertCapability("ARCADE555_GAMES_STOP", "games.play");
    const dialect = resolveArcadeGamesDialect();
    const requestedSessionId = extractTextOption(message, options, "sessionId");
    if (dialect !== "agent-v1") {
      return success(callback, "Arcade game stop requested.", { dialect, sessionId: requestedSessionId ?? null });
    }

    const base = resolveArcadeGamesBase(dialect);
    const token = await resolveAgentBearer(base);
    const sessionId = await ensureAgentSessionId(base, token, requestedSessionId);
    const response = await fetchJson(
      "POST",
      base,
      resolveStopEndpoint(dialect, sessionId),
      token,
      {},
    );
    if (!response.ok) {
      return failure(
        callback,
        "Game stop failed.",
        getErrorDetail(response),
        { status: response.status, sessionId },
      );
    }
    return success(callback, "Arcade game stop requested.", {
      ...(response.data ?? {}),
      sessionId,
    });
  } catch (error) {
    return failure(
      callback,
      `Game stop failed: ${(error as Error).message}`,
      (error as Error).message,
    );
  }
}

export async function runArcadeGamesGoLivePlay(
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined,
  options: Record<string, unknown> | undefined,
  callback?: HandlerCallback,
): Promise<boolean> {
  try {
    assertTrustedAdmin(runtime, message, state, "ARCADE555_GAMES_GO_LIVE_PLAY");
    assertCapability("ARCADE555_GAMES_GO_LIVE_PLAY", "games.play");
    assertCapability("ARCADE555_GAMES_GO_LIVE_PLAY", "stream.control");

    const dialect = resolveArcadeGamesDialect();
    if (dialect !== "agent-v1") {
      return failure(
        callback,
        "ARCADE555_GAMES_GO_LIVE_PLAY requires agent-v1 dialect.",
        "agent_v1_required",
      );
    }

    const base = resolveArcadeGamesBase(dialect);
    const tokenProvider = async (): Promise<string> => resolveAgentBearer(base);
    const token = await tokenProvider();
    const requestedSessionId = extractTextOption(message, options, "sessionId");
    const requestedGameId = extractTextOption(message, options, "gameId");
    const mode = normalizeMode(extractTextOption(message, options, "mode"), dialect);
    const cfConnectTimeoutMs = readPositiveIntEnv(
      [CF_CONNECT_TIMEOUT_MS_ENV, LEGACY_CF_CONNECT_TIMEOUT_MS_ENV],
      DEFAULT_CF_CONNECT_TIMEOUT_MS,
    );
    const cfConnectPollMs = readPositiveIntEnv(
      [CF_CONNECT_POLL_MS_ENV, LEGACY_CF_CONNECT_POLL_MS_ENV],
      DEFAULT_CF_CONNECT_POLL_MS,
    );
    const cfRecoveryAttempts = readNonNegativeIntEnv(
      [CF_RECOVERY_ATTEMPTS_ENV, LEGACY_CF_RECOVERY_ATTEMPTS_ENV],
      DEFAULT_CF_RECOVERY_ATTEMPTS,
    );

    const sessionId = await ensureAgentSessionId(base, token, requestedSessionId);
    await ensureAgentCloudflareOutput(base, token, sessionId);

    const resolvedGameId = await resolveAgentGameId(
      base,
      token,
      sessionId,
      requestedGameId,
    );
    if (!resolvedGameId) {
      return failure(
        callback,
        "No playable game could be resolved for go-live launch.",
        "missing_game_id",
      );
    }

    let launchPolicyContext: LaunchPolicyContext | null = null;
    try {
      launchPolicyContext = await prepareLaunchPolicyContext(
        base,
        tokenProvider,
        sessionId,
        resolvedGameId,
      );
    } catch (error) {
      getArcade555RuntimeConfig().logger?.warn?.(
        `[555arcade] intelligence bootstrap skipped for ${resolvedGameId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    let lastConnectivity: CloudflareConnectCheck | undefined;
    for (let attempt = 0; attempt <= cfRecoveryAttempts; attempt += 1) {
      const playResponse = await fetchJson(
        "POST",
        base,
        resolvePlayEndpoint(dialect, sessionId),
        token,
        {
          gameId: resolvedGameId,
          mode,
          ...(launchPolicyContext
            ? {
                controlAuthority: launchPolicyContext.controlAuthority,
                policyVersion: launchPolicyContext.policyVersion,
                policySnapshot: launchPolicyContext.policySnapshot,
                policyFamily: launchPolicyContext.policyFamily,
              }
            : {}),
        },
      );
      if (!playResponse.ok) {
        return failure(
          callback,
          "Go-live play failed.",
          getErrorDetail(playResponse),
          { status: playResponse.status, sessionId, gameId: resolvedGameId },
        );
      }

      lastConnectivity = await waitForAgentCloudflareConnection(
        base,
        token,
        sessionId,
        cfConnectTimeoutMs,
        cfConnectPollMs,
      );
      if (lastConnectivity.connected) {
        return success(callback, `Go-live play started for ${resolvedGameId}.`, {
          ...(playResponse.data ?? {}),
          sessionId,
          gameId: resolvedGameId,
          mode,
          cloudflare: lastConnectivity.lastSnapshot ?? null,
        });
      }

      if (attempt >= cfRecoveryAttempts) {
        break;
      }

      await stopAgentStream(base, token, sessionId, {
        allowMissing: true,
      });
      await ensureAgentCloudflareOutput(base, token, sessionId);
    }

    const phase = lastConnectivity?.lastSnapshot?.phase ?? "unknown";
    const cloudflareState =
      lastConnectivity?.lastSnapshot?.cloudflareState ?? "unknown";
    const disconnectMessage =
      `Cloudflare ingest stayed disconnected after ${cfRecoveryAttempts + 1} play attempt(s) ` +
      `(phase=${phase}, cloudflareState=${cloudflareState})`;
    return failure(
      callback,
      `Go-live play failed: ${disconnectMessage}`,
      disconnectMessage,
      { sessionId, gameId: resolvedGameId, phase, cloudflareState },
    );
  } catch (error) {
    return failure(
      callback,
      `Go-live play failed: ${(error as Error).message}`,
      (error as Error).message,
    );
  }
}

export async function runArcadeGamesLiveCapabilitySprint(
  runtime: IAgentRuntime,
  message: Memory,
  state: State | undefined,
  options: Record<string, unknown> | undefined,
  callback?: HandlerCallback,
): Promise<boolean> {
  try {
    assertTrustedAdmin(
      runtime,
      message,
      state,
      "ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT",
    );
    assertCapability("ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT", "games.play");
    assertCapability("ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT", "games.observe");
    assertCapability("ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT", "stream.control");

    const dialect = resolveArcadeGamesDialect();
    if (dialect !== "agent-v1") {
      return failure(
        callback,
        "ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT requires agent-v1 dialect.",
        "agent_v1_required",
      );
    }

    const base = resolveArcadeGamesBase(dialect);
    const tokenProvider = async (): Promise<string> => resolveAgentBearer(base);
    const token = await tokenProvider();
    const requestedSessionId = extractTextOption(message, options, "sessionId");
    const dryRun = extractBooleanOption(message, options, "dryRun") ?? false;
    const slotSeconds = Math.max(
      0,
      extractNumberOption(message, options, "slotSeconds") ??
        readPositiveIntEnv(
          [SPRINT_SLOT_SECONDS_ENV, LEGACY_SPRINT_SLOT_SECONDS_ENV],
          DEFAULT_SPRINT_SLOT_SECONDS,
        ),
    );
    const adOffsetSeconds = Math.min(
      slotSeconds,
      Math.max(
        0,
        extractNumberOption(message, options, "adOffsetSeconds") ??
          readPositiveIntEnv(
            [SPRINT_AD_OFFSET_SECONDS_ENV, LEGACY_SPRINT_AD_OFFSET_SECONDS_ENV],
            DEFAULT_SPRINT_AD_OFFSET_SECONDS,
          ),
      ),
    );
    const sprintId =
      extractTextOption(message, options, "sprintId") ||
      `alice-capability-sprint-${Date.now()}`;

    const sessionId = await ensureAgentSessionId(base, token, requestedSessionId);
    await ensureAgentCloudflareOutput(base, token, sessionId);
    const streamStatus = await fetchAgentStreamStatusSnapshot(base, token, sessionId);
    if (!streamStatus.active) {
      return failure(
        callback,
        "Live capability sprint failed: session stream is not active.",
        "stream_inactive",
        { sessionId },
      );
    }

    const availableGameIds = await fetchSprintCatalogGameIds(
      base,
      tokenProvider,
      sessionId,
    );
    const orderedGameIds = resolveSprintGameOrder(availableGameIds);
    const sprintAds = await fetchSprintAds(base, tokenProvider, sessionId);
    const learningClient = new LearningClient(createAgentRequest(base, tokenProvider));
    const slotResults: SprintSlotResult[] = [];
    const reconcilePendingSlots = async (): Promise<void> => {
      for (const slot of slotResults) {
        if (slot.episodeId) continue;
        const startedMs = parseIsoMs(slot.startedAt);
        if (startedMs == null) continue;
        const snapshot = await learningClient
          .fetchSessionLearning(sessionId, slot.gameId)
          .catch(() => null);
        if (!snapshot || !isEpisodeFreshForSlot(snapshot.latestEpisode, startedMs)) {
          continue;
        }
        slot.episodeId = snapshot.latestEpisode?.id ?? null;
        slot.score = toFiniteNumber(snapshot.latestEpisode?.score);
        slot.policyVersionAfter =
          snapshot.profile.policyVersion ?? slot.policyVersionAfter;
        slot.snapshots.push(asSprintSlotSnapshot("final", snapshot));
        slot.compositeScore = computeCompositeScore(slot);
        slot.issues = buildSlotIssues(slot);
      }
    };

    const runSlot = async (
      slotId: number,
      gameId: string,
      diagnosticRetest: boolean,
      sourceSlotId?: number,
    ): Promise<SprintSlotResult> => {
      const ad = sprintAds[(slotId - 1) % sprintAds.length];
      const runId = `${sprintId}-slot-${slotId}-${Date.now()}`;
      const startedAt = new Date().toISOString();
      const startedMs = Date.now();
      const preLearning = await learningClient.fetchSessionLearning(sessionId, gameId);
      const launchPolicyContext = dryRun
        ? null
        : await prepareLaunchPolicyContext(base, tokenProvider, sessionId, gameId).catch(
            () => null,
          );

      if (!dryRun) {
        const switchPayload: Record<string, unknown> = {
          gameId,
          mode: "agent",
          runId,
          sprintId,
          slotId,
          adId: ad.adId,
          allowUncertified: true,
          certificationBypass: true,
          controlAuthority: "milaidy",
        };
        if (launchPolicyContext) {
          switchPayload.policyVersion = launchPolicyContext.policyVersion;
          switchPayload.policySnapshot = launchPolicyContext.policySnapshot;
        }

        let switchResponse = await fetchJson(
          "POST",
          base,
          resolveSwitchEndpoint(dialect, sessionId),
          tokenProvider,
          switchPayload,
        );
        if (!switchResponse.ok && switchResponse.status === 404) {
          await fetchJson(
            "POST",
            base,
            resolveStopEndpoint(dialect, sessionId),
            tokenProvider,
            { reason: "sprint_switch_fallback" },
          );
          switchResponse = await fetchJson(
            "POST",
            base,
            resolvePlayEndpoint(dialect, sessionId),
            tokenProvider,
            switchPayload,
          );
        }
        if (!switchResponse.ok) {
          throw new Error(
            `slot ${slotId} switch failed (${switchResponse.status}): ${getErrorDetail(switchResponse)}`,
          );
        }
      }

      const snapshots: SprintSlotSnapshot[] = [];
      if (!dryRun) {
        for (const checkpoint of DEFAULT_SPRINT_SLOT_CHECKPOINTS_SECONDS) {
          if (checkpoint > slotSeconds) continue;
          await waitUntil(startedMs, checkpoint);
          const checkpointLearning = await learningClient.fetchSessionLearning(
            sessionId,
            gameId,
          );
          snapshots.push(asSprintSlotSnapshot("checkpoint", checkpointLearning));
        }
      }

      let adOutcome: { triggered: boolean; rendered: boolean; detail?: string } = {
        triggered: false,
        rendered: false,
        detail: "ad not attempted",
      };
      if (!dryRun) {
        await waitUntil(startedMs, adOffsetSeconds);
        adOutcome = await triggerSprintAd(base, tokenProvider, sessionId, ad.adId);
        if (
          !adOutcome.triggered &&
          (adOutcome.detail || "").toLowerCase().includes("cooldown") &&
          DEFAULT_SPRINT_AD_RETRY_OFFSET_SECONDS <= slotSeconds
        ) {
          await waitUntil(startedMs, DEFAULT_SPRINT_AD_RETRY_OFFSET_SECONDS);
          adOutcome = await triggerSprintAd(base, tokenProvider, sessionId, ad.adId);
        }
      }

      if (!dryRun) {
        await waitUntil(startedMs, slotSeconds);
      }

      const postLearning = await fetchSlotFinalLearningSnapshot(
        learningClient,
        sessionId,
        gameId,
        startedMs,
      );
      snapshots.push(asSprintSlotSnapshot("final", postLearning));

      const slotResult: SprintSlotResult = {
        sprintId,
        slotId,
        gameId,
        diagnosticRetest,
        startedAt,
        endedAt: new Date().toISOString(),
        runId,
        adId: ad.adId,
        adTriggered: adOutcome.triggered,
        adRendered: adOutcome.rendered,
        score: toFiniteNumber(postLearning.latestEpisode?.score),
        episodeId: postLearning.latestEpisode?.id ?? null,
        policyVersionBefore: preLearning.profile.policyVersion ?? null,
        policyVersionAfter: postLearning.profile.policyVersion ?? null,
        compositeScore: 0,
        snapshots,
        issues: [],
      };

      slotResult.compositeScore = computeCompositeScore(slotResult);
      slotResult.issues = buildSlotIssues(slotResult);

      if (diagnosticRetest && sourceSlotId != null) {
        const baseline = slotResults.find((entry) => entry.slotId === sourceSlotId);
        if (baseline && slotResult.compositeScore <= baseline.compositeScore) {
          slotResult.issues.push({
            category: "learning",
            severity: "medium",
            symptom: "Diagnostic retest did not improve over baseline slot",
            probableCause: "Policy corrections were not applied or were ineffective",
            evidence: `baseline=${baseline.compositeScore}, retest=${slotResult.compositeScore}`,
            fixHint: "Review correction deltas and apply tighter hazard/resource tuning",
          });
        }
      }

      return slotResult;
    };

    for (let index = 0; index < orderedGameIds.length; index += 1) {
      const gameId = orderedGameIds[index];
      const slotId = index + 1;
      const result = await runSlot(slotId, gameId, false);
      slotResults.push(result);
      await reconcilePendingSlots();
    }

    const diagnostics = selectDiagnosticRetests(slotResults, SPRINT_DIAGNOSTIC_SLOTS);
    for (let index = 0; index < diagnostics.length; index += 1) {
      const selection = diagnostics[index];
      const slotId = orderedGameIds.length + index + 1;
      const result = await runSlot(slotId, selection.gameId, true, selection.sourceSlotId);
      slotResults.push(result);
      await reconcilePendingSlots();
    }

    await reconcilePendingSlots();

    const summary = {
      sprintId,
      sessionId,
      dryRun,
      slotSeconds,
      adOffsetSeconds,
      expectedSlots: SPRINT_EXPECTED_GAME_COUNT + SPRINT_DIAGNOSTIC_SLOTS,
      completedSlots: slotResults.length,
      adSuccessSlots: slotResults.filter((entry) => entry.adTriggered && entry.adRendered)
        .length,
      learningEpisodeSlots: slotResults.filter((entry) => Boolean(entry.episodeId)).length,
      averageCompositeScore:
        slotResults.length > 0
          ? Number(
              (
                slotResults.reduce((sum, entry) => sum + entry.compositeScore, 0) /
                slotResults.length
              ).toFixed(2),
            )
          : 0,
      diagnosticRetests: diagnostics,
    };

    return success(callback, "Live capability sprint completed.", {
      summary,
      slots: slotResults,
    });
  } catch (error) {
    return failure(
      callback,
      `Live capability sprint failed: ${(error as Error).message}`,
      (error as Error).message,
    );
  }
}

export function buildLegacyAliasEnvelope(
  actionName: string,
  callbackPayload: { text: string; content?: Record<string, unknown> } | null,
  result: unknown,
): { success: boolean; text: string } {
  if (
    result &&
    typeof result === "object" &&
    "success" in result &&
    "text" in result &&
    typeof (result as { text?: unknown }).text === "string"
  ) {
    return result as { success: boolean; text: string };
  }

  const parsed = parseCallbackPayload(callbackPayload);
  const payload = parsed.success
    ? {
        ok: true,
        code: "OK",
        module: "arcade555.compat",
        action: actionName,
        message: callbackPayload?.text ?? `${actionName} succeeded`,
        status: 200,
        retryable: false,
        data: parsed.data ?? {},
        deprecation: {
          replacement: actionName.replace(/^FIVE55_/, "ARCADE555_"),
          removalRelease: LEGACY_REMOVAL_RELEASE,
        },
      }
    : {
        ok: false,
        code: "E_RUNTIME_EXCEPTION",
        module: "arcade555.compat",
        action: actionName,
        message: callbackPayload?.text ?? `${actionName} failed`,
        status: 500,
        retryable: false,
        details: {
          error: parsed.error ?? "compat_action_failed",
          replacement: actionName.replace(/^FIVE55_/, "ARCADE555_"),
          removalRelease: LEGACY_REMOVAL_RELEASE,
        },
      };

  return {
    success: parsed.success,
    text: JSON.stringify(payload),
  };
}
