import { HttpClient } from "../lib/httpClient.js";
import type {
  Arcade555Config,
  GameCatalogResponse,
  GamePlayRequest,
  HealthcheckResult,
  IAgentRuntime,
  ScoreSubmitRequest,
  Service,
  SessionRecord,
} from "../types/index.js";

export class ArcadeControlService implements Service {
  static serviceType = "arcade555";

  private config: Arcade555Config | null = null;
  private httpClient: HttpClient | null = null;
  private boundSessionId: string | null = null;

  get serviceType(): string {
    return ArcadeControlService.serviceType;
  }

  async initialize(_runtime: IAgentRuntime): Promise<void> {
    const baseUrl = process.env.ARCADE555_BASE_URL ?? process.env.STREAM555_BASE_URL;
    const agentToken =
      process.env.ARCADE555_AGENT_TOKEN ?? process.env.STREAM555_AGENT_TOKEN;

    if (!baseUrl || !agentToken) {
      throw new Error(
        "[555arcade] Missing config: set ARCADE555_BASE_URL + ARCADE555_AGENT_TOKEN (or STREAM555_* fallback).",
      );
    }

    this.config = {
      baseUrl,
      agentToken,
      defaultSessionId: process.env.ARCADE555_DEFAULT_SESSION_ID,
      requireApprovals: process.env.ARCADE555_REQUIRE_APPROVALS !== "false",
    };

    this.httpClient = new HttpClient({
      baseUrl,
      token: agentToken,
      timeout: Number.parseInt(process.env.ARCADE555_REQUEST_TIMEOUT_MS || "20000", 10),
      maxRetries: Number.parseInt(process.env.ARCADE555_RETRY_MAX || "2", 10),
    });

    if (this.config.defaultSessionId) {
      this.boundSessionId = this.config.defaultSessionId;
    }
  }

  async stop(): Promise<void> {
    this.boundSessionId = null;
  }

  getBoundSessionId(): string | null {
    return this.boundSessionId;
  }

  async healthcheck(): Promise<HealthcheckResult> {
    const result: HealthcheckResult = {
      allPassed: false,
      checks: {
        apiReachable: { passed: false, message: "not checked" },
        authValid: { passed: false, message: "not checked" },
      },
    };

    const startApi = Date.now();
    const health = await this.client.get<Record<string, unknown>>("/api/agent/v1/health");
    result.checks.apiReachable = {
      passed: health.success,
      message: health.success ? "ok" : health.error || "unreachable",
      latencyMs: Date.now() - startApi,
    };

    if (!health.success) {
      result.allPassed = false;
      return result;
    }

    const startAuth = Date.now();
    const sessions = await this.client.get<Record<string, unknown>>("/api/agent/v1/sessions");
    result.checks.authValid = {
      passed: sessions.success,
      message: sessions.success ? "token valid" : sessions.error || "auth failed",
      latencyMs: Date.now() - startAuth,
    };

    result.allPassed = result.checks.apiReachable.passed && result.checks.authValid.passed;
    return result;
  }

  async verifyAuth(): Promise<{ success: boolean; message: string }> {
    const check = await this.healthcheck();
    if (check.allPassed) {
      return { success: true, message: "auth verified" };
    }

    return {
      success: false,
      message: check.checks.authValid.message || "auth verification failed",
    };
  }

  async bootstrapSession(sessionId?: string): Promise<SessionRecord> {
    const response = await this.client.post<SessionRecord>(
      "/api/agent/v1/sessions",
      sessionId ? { sessionId } : {},
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to bootstrap session");
    }
    this.boundSessionId = response.data.id || sessionId || null;
    return response.data;
  }

  async getSession(sessionId?: string): Promise<SessionRecord> {
    const id = this.requireSessionId(sessionId);
    const response = await this.client.get<SessionRecord>(`/api/agent/v1/sessions/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to read session");
    }
    return response.data;
  }

  async gamesCatalog(
    sessionId?: string,
    options?: { filter?: string; includeBeta?: boolean },
  ): Promise<GameCatalogResponse> {
    const id = this.requireSessionId(sessionId);
    const response = await this.client.post<GameCatalogResponse>(
      `/api/agent/v1/sessions/${id}/games/catalog`,
      {
        filter: options?.filter,
        includeBeta: options?.includeBeta,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to load game catalog");
    }
    return response.data;
  }

  async gamesPlay(sessionId: string | undefined, payload: GamePlayRequest): Promise<Record<string, unknown>> {
    const id = this.requireSessionId(sessionId);
    const response = await this.client.post<Record<string, unknown>>(
      `/api/agent/v1/sessions/${id}/games/play`,
      {
        gameId: payload.gameId,
        mode: payload.mode ?? "agent",
        goal: payload.goal,
        quickActions: payload.quickActions,
        masteryProfile: payload.masteryProfile,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to start game");
    }
    return response.data;
  }

  async gamesSwitch(sessionId: string | undefined, payload: GamePlayRequest): Promise<Record<string, unknown>> {
    const id = this.requireSessionId(sessionId);
    const response = await this.client.post<Record<string, unknown>>(
      `/api/agent/v1/sessions/${id}/games/switch`,
      {
        gameId: payload.gameId,
        mode: payload.mode ?? "agent",
        goal: payload.goal,
        quickActions: payload.quickActions,
        masteryProfile: payload.masteryProfile,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to switch game");
    }
    return response.data;
  }

  async gamesStop(sessionId?: string): Promise<Record<string, unknown>> {
    const id = this.requireSessionId(sessionId);
    const response = await this.client.post<Record<string, unknown>>(
      `/api/agent/v1/sessions/${id}/games/stop`,
      {},
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to stop game");
    }
    return response.data;
  }

  async submitScore(
    sessionId: string | undefined,
    payload: ScoreSubmitRequest,
  ): Promise<Record<string, unknown>> {
    const id = this.requireSessionId(sessionId);
    const runId = payload.runId || generateRunId();
    const response = await this.client.post<Record<string, unknown>>(
      `/api/agent/v1/sessions/${id}/games/${encodeURIComponent(payload.gameId)}/telemetry`,
      {
        runId,
        score: payload.score,
        recordedAt: new Date().toISOString(),
        metadata: payload.metadata || {},
      },
      {
        idempotencyKey: `${id}:${payload.gameId}:${runId}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to submit score telemetry");
    }
    return response.data;
  }

  getCapabilities(): Record<string, unknown> {
    return {
      gamesCatalog: true,
      gamesPlay: true,
      gamesSwitch: true,
      gamesStop: true,
      scoreSubmit: true,
      defaultSessionId: this.config?.defaultSessionId || null,
      requireApprovals: this.config?.requireApprovals ?? true,
      canonical: true,
    };
  }

  private requireSessionId(sessionId?: string): string {
    const id = sessionId || this.boundSessionId || this.config?.defaultSessionId || null;
    if (!id) {
      throw new Error("sessionId is required; run ARCADE555_SESSION_BOOTSTRAP first");
    }
    this.boundSessionId = id;
    return id;
  }

  private get client(): HttpClient {
    if (!this.httpClient) {
      throw new Error("[555arcade] service not initialized");
    }
    return this.httpClient;
  }
}

function generateRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

