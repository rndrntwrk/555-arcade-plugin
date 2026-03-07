export interface Plugin {
  name: string;
  description: string;
  init?: (config: unknown, runtime: IAgentRuntime) => Promise<void>;
  services?: Array<new () => Service>;
  providers?: Provider[];
  actions?: Action[];
  routes?: Route[];
}

export interface Service {
  initialize(runtime: IAgentRuntime): Promise<void>;
  stop?(): Promise<void>;
  get serviceType(): string;
}

export interface IAgentRuntime {
  getService<T = unknown>(name: string): T | undefined;
  registerService?(service: Service): Promise<void>;
}

export interface Provider {
  name: string;
  get: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ) => Promise<string>;
}

export interface Route {
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  handler: (...args: unknown[]) => Promise<unknown> | unknown;
}

export interface Action {
  name: string;
  description: string;
  similes?: string[];
  validate?: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ) => Promise<boolean>;
  handler: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ) => Promise<unknown>;
  examples?: ActionExample[][];
}

export type HandlerCallback = (payload: {
  text: string;
  content?: Record<string, unknown>;
}) => void;

export interface ActionExample {
  user: string;
  content: {
    text: string;
    action?: string;
  };
}

export interface Memory {
  content?: {
    text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface State {
  [key: string]: unknown;
}

export interface HttpClientOptions {
  baseUrl: string;
  token: string;
  tokenProvider?: () => Promise<string>;
  timeout?: number;
  maxRetries?: number;
}

export interface HttpRequestOptions {
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
  status?: number;
}

export interface Arcade555Config {
  baseUrl: string;
  agentToken: string;
  defaultSessionId?: string;
  requireApprovals: boolean;
  scoreCaptureBaseUrl?: string;
  leaderboardBaseUrl?: string;
  questsBaseUrl?: string;
  battlesBaseUrl?: string;
  battlesCreateEndpoint?: string;
  rewardsBaseUrl?: string;
  socialBaseUrl?: string;
  adminBaseUrl?: string;
  adminBearerToken?: string;
  githubToken?: string;
}

export interface HealthcheckResult {
  allPassed: boolean;
  checks: {
    apiReachable: CheckResult;
    authValid: CheckResult;
  };
}

export interface CheckResult {
  passed: boolean;
  message: string;
  latencyMs?: number;
}

export interface Arcade555RuntimeState {
  loaded: boolean;
  authenticated: boolean;
  authSource: string;
  sessionBootstrapped: boolean;
  catalogReachable: boolean;
  scorePipelineReachable: boolean;
  leaderboardReachable: boolean;
  questsReachable: boolean;
  warnings: string[];
  errors: string[];
}

export interface SessionRecord {
  id: string;
  active?: boolean;
  cfSessionId?: string | null;
  characterId?: string | null;
  [key: string]: unknown;
}

export interface GameCatalogResponse {
  games?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface GamePlayRequest {
  gameId: string;
  mode?: string;
  goal?: string;
  quickActions?: string[];
  masteryProfile?: Record<string, unknown>;
}

export interface ScoreSubmitRequest {
  gameId: string;
  score: number;
  runId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ScoreReadRequest {
  gameId: string;
  sessionId: string;
}

export interface LeaderboardReadRequest {
  board?: "global" | "game";
  gameId?: string;
}

export interface LeaderboardWriteRequest {
  userId: string;
  gameId?: string;
  score: number;
}

export interface QuestsReadRequest {
  userId?: string;
  status?: "active" | "completed" | "all";
}

export interface QuestsCreateRequest {
  title: string;
  objective: string;
}

export interface QuestsCompleteRequest {
  questId: string;
  userId: string;
}

export interface BattlesReadRequest {
  status?: "active" | "pending" | "resolved" | "all";
}

export interface BattlesCreateRequest {
  gameId: string;
  targetId?: string;
  wagerAmount?: number;
  currencyMint?: string;
  metadata?: Record<string, unknown>;
}

export interface BattlesResolveRequest {
  battleId: string;
  winnerId: string;
}

export interface RewardsProjectRequest {
  window?: "daily" | "weekly" | "monthly";
  userId?: string;
}

export interface RewardsAllocateRequest {
  userId: string;
  amount: number;
  asset?: "USDC" | "CREDITS";
}

export interface SocialMonitorRequest {
  source?: "twitter" | "discord" | "stream-chat";
  handle?: string;
}

export interface SocialAssignPointsRequest {
  userId: string;
  points: number;
  reason?: string;
}

export interface AdminThemeSetRequest {
  theme: string;
}

export interface AdminEventTriggerRequest {
  type?: string;
  durationMinutes?: number;
}

export interface AdminCabinetPossessRequest {
  gameId: string;
  agentId?: string;
  capability?: string;
  value?: string;
  message?: string;
}

export interface AdminCabinetReleaseRequest {
  cabinetId: string;
}

export interface GithubListReposRequest {
  owner?: string;
  includePrivate?: boolean;
  sinceDays?: number;
  limit?: number;
}

export type Arcade555GameCatalogItem = Record<string, unknown>;
export type Arcade555GamesCatalogResponse = GameCatalogResponse;
export type Arcade555GamePlayResponse = Record<string, unknown>;
export type Arcade555MasteryContract = import("../mastery/index.js").Arcade555MasteryContract;
export type Arcade555MasteryRun = import("../mastery/index.js").Arcade555MasteryRun;
export type Arcade555MasteryEpisode = import("../mastery/index.js").Arcade555MasteryEpisode;
export type Arcade555MasteryGameSnapshot = import("../mastery/index.js").Arcade555MasteryGameSnapshot;
export type Arcade555MasteryVerdict = import("../mastery/index.js").Arcade555MasteryVerdict;
export type Arcade555MasteryEvidenceFrame = import("../mastery/index.js").Arcade555MasteryEvidenceFrame;
export type Arcade555MasteryConsistencyVerdict =
  import("../mastery/index.js").Arcade555MasteryConsistencyVerdict;

/** @deprecated Use Arcade555MasteryContract */
export type Five55MasteryContract = Arcade555MasteryContract;
/** @deprecated Use Arcade555MasteryRun */
export type Five55MasteryRun = Arcade555MasteryRun;
/** @deprecated Use Arcade555MasteryEpisode */
export type Five55MasteryEpisode = Arcade555MasteryEpisode;
/** @deprecated Use Arcade555MasteryGameSnapshot */
export type Five55MasteryGameSnapshot = Arcade555MasteryGameSnapshot;
/** @deprecated Use Arcade555MasteryVerdict */
export type Five55MasteryVerdict = Arcade555MasteryVerdict;
