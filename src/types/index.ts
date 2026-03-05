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
  ) => Promise<boolean>;
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
  timeout?: number;
  maxRetries?: number;
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
  metadata?: Record<string, unknown>;
}

