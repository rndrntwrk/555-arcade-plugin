import { HttpClient } from "../lib/httpClient.js";
import {
  describeAgentAuthSource,
  isAgentAuthConfigured,
  resolveAgentBearer,
} from "../lib/transport/agent-auth.js";
import type {
  AdminCabinetPossessRequest,
  AdminCabinetReleaseRequest,
  AdminEventTriggerRequest,
  AdminThemeSetRequest,
  Arcade555RuntimeState,
  Arcade555Config,
  BattlesCreateRequest,
  BattlesReadRequest,
  BattlesResolveRequest,
  GameCatalogResponse,
  GamePlayRequest,
  HealthcheckResult,
  IAgentRuntime,
  LeaderboardReadRequest,
  LeaderboardWriteRequest,
  QuestsCompleteRequest,
  QuestsCreateRequest,
  QuestsReadRequest,
  RewardsAllocateRequest,
  RewardsProjectRequest,
  GithubListReposRequest,
  ScoreReadRequest,
  ScoreSubmitRequest,
  SocialAssignPointsRequest,
  SocialMonitorRequest,
  Service,
  SessionRecord,
} from "../types/index.js";

export class ArcadeControlService implements Service {
  static serviceType = "arcade555";

  static async start(runtime: IAgentRuntime): Promise<ArcadeControlService> {
    const service = new ArcadeControlService();
    await service.initialize(runtime);
    return service;
  }

  private config: Arcade555Config | null = null;
  private httpClient: HttpClient | null = null;
  private scoreCaptureClient: HttpClient | null = null;
  private leaderboardClient: HttpClient | null = null;
  private questsClient: HttpClient | null = null;
  private battlesClient: HttpClient | null = null;
  private rewardsClient: HttpClient | null = null;
  private socialClient: HttpClient | null = null;
  private adminClient: HttpClient | null = null;
  private boundSessionId: string | null = null;

  get serviceType(): string {
    return ArcadeControlService.serviceType;
  }

  async initialize(_runtime: IAgentRuntime): Promise<void> {
    const baseUrl = process.env.ARCADE555_BASE_URL ?? process.env.STREAM555_BASE_URL;
    const agentToken =
      baseUrl && baseUrl.trim().length > 0
        ? await resolveAgentBearer(baseUrl)
        : undefined;
    const scoreCaptureBaseUrl =
      resolveScopedBaseUrl(
        process.env.ARCADE555_SCORE_CAPTURE_API_URL,
        process.env.FIVE55_SCORE_CAPTURE_API_URL,
      ) ?? baseUrl;
    const leaderboardBaseUrl =
      resolveScopedBaseUrl(
        process.env.ARCADE555_LEADERBOARD_API_URL,
        process.env.FIVE55_LEADERBOARD_API_URL,
      ) ?? baseUrl;
    const questsBaseUrl =
      resolveScopedBaseUrl(
        process.env.ARCADE555_QUESTS_API_URL,
        process.env.FIVE55_QUESTS_API_URL,
      ) ?? baseUrl;
    const battlesBaseUrl =
      resolveScopedBaseUrl(
        process.env.ARCADE555_BATTLES_API_URL,
        process.env.FIVE55_BATTLES_API_URL,
      ) ?? baseUrl;
    const rewardsBaseUrl =
      resolveScopedBaseUrl(
        process.env.ARCADE555_REWARDS_API_URL,
        process.env.FIVE55_REWARDS_API_URL,
      ) ?? baseUrl;
    const socialBaseUrl =
      resolveScopedBaseUrl(
        process.env.ARCADE555_SOCIAL_API_URL,
        process.env.FIVE55_SOCIAL_API_URL,
      ) ?? baseUrl;
    const adminBaseUrl =
      resolveFirstValue([
        process.env.ARCADE555_ADMIN_API_URL,
        process.env.FIVE55_ADMIN_API_URL,
        process.env.TWITTER_AGENT_MAIN_API_BASE,
        process.env.TWITTER_BOT_MAIN_API_BASE,
      ]) ?? baseUrl;
    const adminBearerToken =
      resolveFirstValue([
        process.env.ARCADE555_ADMIN_BEARER_TOKEN,
        process.env.FIVE55_ADMIN_BEARER_TOKEN,
        process.env.ADMIN_API_TOKEN,
        process.env.TWITTER_AGENT_KEY,
        process.env.TWITTER_BOT_KEY,
      ]) ?? agentToken;
    const githubToken = resolveFirstValue([
      process.env.ARCADE555_GITHUB_TOKEN,
      process.env.GITHUB_API_TOKEN,
      process.env.ALICE_GH_TOKEN,
    ]);
    const battlesCreateEndpoint =
      resolveScopedValue(
        process.env.ARCADE555_BATTLES_CREATE_ENDPOINT,
        process.env.FIVE55_BATTLES_CREATE_ENDPOINT,
      ) ?? "/battle/create";

    if (!baseUrl || !agentToken) {
      throw new Error(
        "[555arcade] Missing config: set ARCADE555_BASE_URL and one of ARCADE555_AGENT_API_KEY / ARCADE555_AGENT_TOKEN (STREAM555_* fallback supported).",
      );
    }
    const resolvedScoreCaptureBaseUrl = scoreCaptureBaseUrl ?? baseUrl;
    const resolvedLeaderboardBaseUrl = leaderboardBaseUrl ?? baseUrl;
    const resolvedQuestsBaseUrl = questsBaseUrl ?? baseUrl;
    const resolvedBattlesBaseUrl = battlesBaseUrl ?? baseUrl;
    const resolvedRewardsBaseUrl = rewardsBaseUrl ?? baseUrl;
    const resolvedSocialBaseUrl = socialBaseUrl ?? baseUrl;
    const resolvedAdminBaseUrl = adminBaseUrl ?? baseUrl;
    const resolvedAdminBearerToken = adminBearerToken ?? agentToken;

    this.config = {
      baseUrl,
      agentToken,
      defaultSessionId: process.env.ARCADE555_DEFAULT_SESSION_ID,
      requireApprovals: process.env.ARCADE555_REQUIRE_APPROVALS !== "false",
      scoreCaptureBaseUrl: resolvedScoreCaptureBaseUrl,
      leaderboardBaseUrl: resolvedLeaderboardBaseUrl,
      questsBaseUrl: resolvedQuestsBaseUrl,
      battlesBaseUrl: resolvedBattlesBaseUrl,
      battlesCreateEndpoint,
      rewardsBaseUrl: resolvedRewardsBaseUrl,
      socialBaseUrl: resolvedSocialBaseUrl,
      adminBaseUrl: resolvedAdminBaseUrl,
      adminBearerToken: resolvedAdminBearerToken,
      githubToken: githubToken ?? undefined,
    };

    const requestTimeoutMs = Number.parseInt(
      process.env.ARCADE555_REQUEST_TIMEOUT_MS || "20000",
      10,
    );
    const maxRetries = Number.parseInt(process.env.ARCADE555_RETRY_MAX || "2", 10);
    const agentTokenProvider = () => resolveAgentBearer(this.config?.baseUrl ?? baseUrl);
    const adminTokenProvider =
      resolvedAdminBearerToken === agentToken
        ? agentTokenProvider
        : undefined;

    this.httpClient = new HttpClient({
      baseUrl,
      token: agentToken,
      tokenProvider: agentTokenProvider,
      timeout: requestTimeoutMs,
      maxRetries,
    });

    this.scoreCaptureClient = new HttpClient({
      baseUrl: resolvedScoreCaptureBaseUrl,
      token: agentToken,
      tokenProvider: agentTokenProvider,
      timeout: requestTimeoutMs,
      maxRetries,
    });

    this.leaderboardClient = new HttpClient({
      baseUrl: resolvedLeaderboardBaseUrl,
      token: agentToken,
      tokenProvider: agentTokenProvider,
      timeout: requestTimeoutMs,
      maxRetries,
    });

    this.questsClient = new HttpClient({
      baseUrl: resolvedQuestsBaseUrl,
      token: agentToken,
      tokenProvider: agentTokenProvider,
      timeout: requestTimeoutMs,
      maxRetries,
    });

    this.battlesClient = new HttpClient({
      baseUrl: resolvedBattlesBaseUrl,
      token: agentToken,
      tokenProvider: agentTokenProvider,
      timeout: requestTimeoutMs,
      maxRetries,
    });

    this.rewardsClient = new HttpClient({
      baseUrl: resolvedRewardsBaseUrl,
      token: agentToken,
      tokenProvider: agentTokenProvider,
      timeout: requestTimeoutMs,
      maxRetries,
    });

    this.socialClient = new HttpClient({
      baseUrl: resolvedSocialBaseUrl,
      token: agentToken,
      tokenProvider: agentTokenProvider,
      timeout: requestTimeoutMs,
      maxRetries,
    });

    this.adminClient = new HttpClient({
      baseUrl: resolvedAdminBaseUrl,
      token: resolvedAdminBearerToken,
      tokenProvider: adminTokenProvider,
      timeout: requestTimeoutMs,
      maxRetries,
    });

    if (this.config.defaultSessionId) {
      this.boundSessionId = this.config.defaultSessionId;
    }
  }

  async stop(): Promise<void> {
    this.boundSessionId = null;
    this.httpClient = null;
    this.scoreCaptureClient = null;
    this.leaderboardClient = null;
    this.questsClient = null;
    this.battlesClient = null;
    this.rewardsClient = null;
    this.socialClient = null;
    this.adminClient = null;
    this.config = null;
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

  getRuntimeState(): Arcade555RuntimeState {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!this.config?.baseUrl?.trim()) {
      errors.push("arcade base URL not configured");
    }
    if (!isAgentAuthConfigured()) {
      errors.push("arcade authentication not configured");
    }
    if (!this.boundSessionId && this.config?.defaultSessionId) {
      warnings.push("default session configured but not yet bound");
    }

    return {
      loaded: Boolean(this.config && this.httpClient),
      authenticated: Boolean(this.config?.agentToken?.trim()) && isAgentAuthConfigured(),
      authSource: describeAgentAuthSource(),
      sessionBootstrapped: Boolean(this.boundSessionId),
      catalogReachable: Boolean(this.httpClient && this.config?.baseUrl),
      scorePipelineReachable: Boolean(
        this.scoreCaptureClient && this.config?.scoreCaptureBaseUrl,
      ),
      leaderboardReachable: Boolean(
        this.leaderboardClient && this.config?.leaderboardBaseUrl,
      ),
      questsReachable: Boolean(this.questsClient && this.config?.questsBaseUrl),
      warnings,
      errors,
    };
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
    const id = this.requireSessionId(sessionId ?? payload.sessionId);
    const runId = payload.runId || generateRunId();
    const metadata = {
      ...(payload.metadata || {}),
      run_id: runId,
      session_id: id,
      authority: (payload.metadata?.authority as string | undefined) ?? "milaidy",
      score_source: (payload.metadata?.score_source as string | undefined) ?? "arcade_plugin",
      origin: (payload.metadata?.origin as string | undefined) ?? "arcade-plugin",
      mode: (payload.metadata?.mode as string | undefined) ?? "agent",
    };
    const response = await this.client.post<Record<string, unknown>>(
      `/game/${encodeURIComponent(payload.gameId)}/record`,
      {
        score: payload.score,
        runId,
        sessionId: id,
        authority: metadata.authority,
        mode: metadata.mode,
        source: "arcade-plugin",
        meta: metadata,
      },
      {
        idempotencyKey: `${id}:${payload.gameId}:${runId}`,
        headers: {
          Accept: "application/json",
          "X-Score-Surface": "agent_arcade_plugin",
          "X-Score-Access-Point": "milaidy_chat",
        },
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to submit ranked score");
    }
    return response.data;
  }

  async scoreRead(payload: ScoreReadRequest): Promise<Record<string, unknown>> {
    const response = await this.scoreCaptureApi.post<Record<string, unknown>>(
      "/v1/score-capture/read",
      {
        gameId: payload.gameId,
        sessionId: payload.sessionId,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to read captured score");
    }
    return response.data;
  }

  async leaderboardRead(
    payload: LeaderboardReadRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.leaderboardApi.post<Record<string, unknown>>(
      "/v1/leaderboard/read",
      {
        board: payload.board ?? "global",
        gameId: payload.gameId ?? "",
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to read leaderboard");
    }
    return response.data;
  }

  async leaderboardWrite(
    payload: LeaderboardWriteRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.leaderboardApi.post<Record<string, unknown>>(
      "/v1/leaderboard/write",
      {
        userId: payload.userId,
        gameId: payload.gameId ?? "",
        score: payload.score,
      },
      {
        idempotencyKey: `leaderboard:${payload.userId}:${payload.gameId ?? "global"}:${payload.score}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to write leaderboard");
    }
    return response.data;
  }

  async questsRead(payload: QuestsReadRequest): Promise<Record<string, unknown>> {
    const response = await this.questsApi.post<Record<string, unknown>>(
      "/v1/quests/read",
      {
        userId: payload.userId ?? "",
        status: payload.status ?? "active",
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to read quests");
    }
    return response.data;
  }

  async questsCreate(
    payload: QuestsCreateRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.questsApi.post<Record<string, unknown>>(
      "/v1/quests/create",
      {
        title: payload.title,
        objective: payload.objective,
      },
      {
        idempotencyKey: `quest:create:${payload.title}:${payload.objective}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to create quest");
    }
    return response.data;
  }

  async questsComplete(
    payload: QuestsCompleteRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.questsApi.post<Record<string, unknown>>(
      "/v1/quests/complete",
      {
        questId: payload.questId,
        userId: payload.userId,
      },
      {
        idempotencyKey: `quest:complete:${payload.questId}:${payload.userId}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to complete quest");
    }
    return response.data;
  }

  async battlesRead(
    payload: BattlesReadRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.battlesApi.post<Record<string, unknown>>(
      "/v1/battles/read",
      {
        status: payload.status ?? "active",
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to read battles");
    }
    return response.data;
  }

  async battlesCreate(
    payload: BattlesCreateRequest,
  ): Promise<Record<string, unknown>> {
    const endpoint = this.config?.battlesCreateEndpoint?.trim() || "/battle/create";
    const response = await this.battlesApi.post<Record<string, unknown>>(
      endpoint,
      {
        game_id: payload.gameId,
        target_id: payload.targetId ?? "OPEN",
        wager_amount: Math.max(0, Math.floor(payload.wagerAmount ?? 100)),
        currency_mint: payload.currencyMint ?? "",
        metadata: payload.metadata ?? {},
      },
      {
        idempotencyKey: `battle:create:${payload.gameId}:${payload.targetId ?? "OPEN"}:${Math.max(0, Math.floor(payload.wagerAmount ?? 100))}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to create battle");
    }
    return response.data;
  }

  async battlesResolve(
    payload: BattlesResolveRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.battlesApi.post<Record<string, unknown>>(
      "/v1/battles/resolve",
      {
        battleId: payload.battleId,
        winnerId: payload.winnerId,
      },
      {
        idempotencyKey: `battle:resolve:${payload.battleId}:${payload.winnerId}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to resolve battle");
    }
    return response.data;
  }

  async rewardsProject(
    payload: RewardsProjectRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.rewardsApi.post<Record<string, unknown>>(
      "/v1/rewards/project",
      {
        window: payload.window ?? "weekly",
        userId: payload.userId ?? "",
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to project rewards");
    }
    return response.data;
  }

  async rewardsAllocate(
    payload: RewardsAllocateRequest,
  ): Promise<Record<string, unknown>> {
    const normalizedAmount = Number(payload.amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new Error("amount must be a positive number");
    }
    const response = await this.rewardsApi.post<Record<string, unknown>>(
      "/v1/rewards/allocate",
      {
        userId: payload.userId,
        amount: normalizedAmount.toString(),
        asset: payload.asset ?? "USDC",
      },
      {
        idempotencyKey: `rewards:allocate:${payload.userId}:${normalizedAmount}:${payload.asset ?? "USDC"}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to allocate rewards");
    }
    return response.data;
  }

  async socialMonitor(
    payload: SocialMonitorRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.socialApi.post<Record<string, unknown>>(
      "/v1/social/monitor",
      {
        source: payload.source ?? "twitter",
        handle: payload.handle ?? "",
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to monitor social feed");
    }
    return response.data;
  }

  async socialAssignPoints(
    payload: SocialAssignPointsRequest,
  ): Promise<Record<string, unknown>> {
    if (!Number.isFinite(payload.points)) {
      throw new Error("points must be a finite number");
    }
    const response = await this.socialApi.post<Record<string, unknown>>(
      "/v1/social/assign-points",
      {
        userId: payload.userId,
        points: Math.floor(payload.points).toString(),
        reason: payload.reason ?? "social-interaction",
      },
      {
        idempotencyKey: `social:assign:${payload.userId}:${Math.floor(payload.points)}:${payload.reason ?? "social-interaction"}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to assign social points");
    }
    return response.data;
  }

  async adminThemeSet(
    payload: AdminThemeSetRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.adminApi.post<Record<string, unknown>>(
      "/admin/theme",
      {
        theme: payload.theme,
      },
      {
        idempotencyKey: `admin:theme:${payload.theme}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to update theme");
    }
    return response.data;
  }

  async adminEventTrigger(
    payload: AdminEventTriggerRequest,
  ): Promise<Record<string, unknown>> {
    const durationMinutes = Math.max(
      1,
      Math.floor(payload.durationMinutes ?? 60),
    );
    const response = await this.adminApi.post<Record<string, unknown>>(
      "/admin/event",
      {
        type: payload.type ?? "double_xp",
        duration_minutes: durationMinutes,
      },
      {
        idempotencyKey: `admin:event:${payload.type ?? "double_xp"}:${durationMinutes}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to trigger event");
    }
    return response.data;
  }

  async adminCabinetPossess(
    payload: AdminCabinetPossessRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.adminApi.post<Record<string, unknown>>(
      "/admin/cabinet/possess",
      {
        game_id: payload.gameId,
        agent_id: payload.agentId ?? "arcade555-agent",
        metadata: {
          capability: payload.capability ?? "",
          value: payload.value ?? "",
          message: payload.message ?? "",
          source: "arcade555-plugin",
        },
      },
      {
        idempotencyKey: `admin:cabinet:possess:${payload.gameId}:${payload.agentId ?? "arcade555-agent"}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to possess cabinet");
    }
    return response.data;
  }

  async adminCabinetRelease(
    payload: AdminCabinetReleaseRequest,
  ): Promise<Record<string, unknown>> {
    const response = await this.adminApi.post<Record<string, unknown>>(
      "/admin/cabinet/release",
      {
        cabinet_id: payload.cabinetId,
      },
      {
        idempotencyKey: `admin:cabinet:release:${payload.cabinetId}`,
      },
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "failed to release cabinet");
    }
    return response.data;
  }

  async githubListRepos(
    payload: GithubListReposRequest,
  ): Promise<Record<string, unknown>> {
    const token = this.config?.githubToken?.trim();
    if (!token) {
      throw new Error("ARCADE555_GITHUB_TOKEN (or GITHUB_API_TOKEN/ALICE_GH_TOKEN) is not configured");
    }

    const owner = payload.owner?.trim() || null;
    const includePrivate = payload.includePrivate === true;
    const sinceDays = Number.isFinite(payload.sinceDays)
      ? Math.max(0, Math.floor(payload.sinceDays ?? 0))
      : 0;
    const limit = Number.isFinite(payload.limit)
      ? Math.min(100, Math.max(1, Math.floor(payload.limit ?? 30)))
      : 30;

    const fetched = await fetchGithubRepos({ token, owner, includePrivate });
    const now = Date.now();
    const cutoff = sinceDays > 0 ? now - sinceDays * 24 * 60 * 60 * 1000 : null;
    const filtered = fetched.filter((repo) => {
      if (!cutoff) return true;
      const ts = Date.parse(repo.pushedAt ?? repo.updatedAt ?? "");
      return Number.isFinite(ts) && ts >= cutoff;
    });
    filtered.sort((a, b) => {
      const aTs = Date.parse(a.pushedAt ?? a.updatedAt ?? "") || 0;
      const bTs = Date.parse(b.pushedAt ?? b.updatedAt ?? "") || 0;
      return bTs - aTs;
    });

    const repositories = filtered.slice(0, limit);
    return {
      owner: owner ?? "authenticated-user",
      includePrivate,
      sinceDays: sinceDays > 0 ? sinceDays : null,
      total: filtered.length,
      returned: repositories.length,
      repositories,
    };
  }

  getCapabilities(): Record<string, unknown> {
    return {
      gamesCatalog: true,
      gamesPlay: true,
      gamesSwitch: true,
      gamesStop: true,
      masteryBrief: true,
      masteryCertify: true,
      masteryStatus: true,
      masteryValidate: true,
      masteryEvidence: true,
      scoreRead: true,
      scoreSubmit: true,
      leaderboardRead: true,
      questsRead: true,
      questsCreate: true,
      questsComplete: true,
      battlesRead: true,
      battlesCreate: true,
      battlesResolve: true,
      rewardsProject: true,
      rewardsAllocate: true,
      socialMonitor: true,
      socialAssignPoints: true,
      adminThemeSet: true,
      adminEventTrigger: true,
      adminCabinetPossess: true,
      adminCabinetRelease: true,
      githubListRepos: true,
      defaultSessionId: this.config?.defaultSessionId || null,
      requireApprovals: this.config?.requireApprovals ?? true,
      scoreCaptureBaseUrl: this.config?.scoreCaptureBaseUrl ?? null,
      leaderboardBaseUrl: this.config?.leaderboardBaseUrl ?? null,
      questsBaseUrl: this.config?.questsBaseUrl ?? null,
      battlesBaseUrl: this.config?.battlesBaseUrl ?? null,
      battlesCreateEndpoint: this.config?.battlesCreateEndpoint ?? null,
      rewardsBaseUrl: this.config?.rewardsBaseUrl ?? null,
      socialBaseUrl: this.config?.socialBaseUrl ?? null,
      adminBaseUrl: this.config?.adminBaseUrl ?? null,
      githubTokenConfigured: Boolean(this.config?.githubToken?.trim()),
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

  private get scoreCaptureApi(): HttpClient {
    return this.scoreCaptureClient ?? this.client;
  }

  private get leaderboardApi(): HttpClient {
    return this.leaderboardClient ?? this.client;
  }

  private get questsApi(): HttpClient {
    return this.questsClient ?? this.client;
  }

  private get battlesApi(): HttpClient {
    return this.battlesClient ?? this.client;
  }

  private get rewardsApi(): HttpClient {
    return this.rewardsClient ?? this.client;
  }

  private get socialApi(): HttpClient {
    return this.socialClient ?? this.client;
  }

  private get adminApi(): HttpClient {
    return this.adminClient ?? this.client;
  }
}

interface GitHubRepoRecord {
  name: string;
  fullName: string;
  private: boolean;
  archived: boolean;
  defaultBranch: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
  htmlUrl: string;
}

async function fetchGithubRepos(params: {
  token: string;
  owner: string | null;
  includePrivate: boolean;
}): Promise<GitHubRepoRecord[]> {
  const { token, owner, includePrivate } = params;
  const base = "https://api.github.com";
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "arcade555-plugin/1.0.0",
  } as const;

  if (!owner) {
    const visibility = includePrivate ? "all" : "public";
    return githubGetArray(
      `${base}/user/repos?sort=updated&direction=desc&per_page=100&visibility=${visibility}`,
      headers,
    );
  }

  try {
    return await githubGetArray(
      `${base}/orgs/${encodeURIComponent(owner)}/repos?sort=updated&direction=desc&per_page=100&type=all`,
      headers,
    );
  } catch (error) {
    const message = (error as Error).message || "";
    if (!message.includes("status 404")) {
      throw error;
    }
  }

  const userType = includePrivate ? "owner" : "public";
  return githubGetArray(
    `${base}/users/${encodeURIComponent(owner)}/repos?sort=updated&direction=desc&per_page=100&type=${userType}`,
    headers,
  );
}

async function githubGetArray(
  url: string,
  headers: Record<string, string>,
): Promise<GitHubRepoRecord[]> {
  const response = await fetch(url, { method: "GET", headers });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub API failed with status ${response.status}: ${body.slice(0, 400)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("invalid JSON from GitHub API");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("unexpected GitHub payload shape");
  }

  return parsed
    .filter((entry): entry is Record<string, unknown> => {
      return typeof entry === "object" && entry !== null;
    })
    .map((repo) => ({
      name: String(repo.name ?? ""),
      fullName: String(repo.full_name ?? repo.name ?? ""),
      private: Boolean(repo.private),
      archived: Boolean(repo.archived),
      defaultBranch:
        typeof repo.default_branch === "string" && repo.default_branch.trim()
          ? repo.default_branch.trim()
          : null,
      updatedAt:
        typeof repo.updated_at === "string" && repo.updated_at.trim()
          ? repo.updated_at.trim()
          : null,
      pushedAt:
        typeof repo.pushed_at === "string" && repo.pushed_at.trim()
          ? repo.pushed_at.trim()
          : null,
      htmlUrl: String(repo.html_url ?? ""),
    }));
}

function generateRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function resolveScopedBaseUrl(
  primaryValue: string | undefined,
  legacyValue: string | undefined,
): string | null {
  return resolveScopedValue(primaryValue, legacyValue);
}

function resolveScopedValue(
  primaryValue: string | undefined,
  legacyValue: string | undefined,
): string | null {
  const primary = primaryValue?.trim();
  if (primary) return primary;
  const legacy = legacyValue?.trim();
  if (legacy) return legacy;
  return null;
}

function resolveFirstValue(values: Array<string | undefined>): string | null {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return null;
}
