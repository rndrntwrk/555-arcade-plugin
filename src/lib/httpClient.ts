import type { ApiResponse, HttpClientOptions, HttpRequestOptions } from "../types/index.js";

export class HttpClient {
  private readonly baseUrl: string;
  private token: string;
  private readonly tokenProvider?: () => Promise<string>;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.tokenProvider = options.tokenProvider;
    this.timeout = options.timeout ?? 20_000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path);
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, body, options);
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: HttpRequestOptions,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const requestId = uuidv4();
    let lastError: string | undefined;
    let authRetried = false;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        };

        if (options?.idempotencyKey) {
          headers["Idempotency-Key"] = options.idempotencyKey;
        }
        if (options?.headers) {
          Object.assign(headers, options.headers);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const json = (await response.json().catch(() => ({}))) as
          | (T & { error?: string; requestId?: string })
          | { error?: string; requestId?: string };

        if (!response.ok) {
          if (response.status === 401 && this.tokenProvider && !authRetried) {
            authRetried = true;
            await this.refreshToken();
            attempt -= 1;
            continue;
          }

          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: json.error || `HTTP ${response.status}`,
              requestId: json.requestId || requestId,
              status: response.status,
            };
          }
          throw new Error(json.error || `HTTP ${response.status}`);
        }

        return {
          success: true,
          data: json as T,
          requestId: (json as { requestId?: string }).requestId || requestId,
          status: response.status,
        };
      } catch (error) {
        const err = error as Error;
        lastError = err.name === "AbortError" ? "Request timeout" : err.message;
        if (attempt < this.maxRetries) {
          await sleep(Math.min(500 * 2 ** attempt, 3_000));
        }
      }
    }

    return {
      success: false,
      error: lastError || "Request failed",
      requestId,
    };
  }

  private async refreshToken(): Promise<void> {
    if (!this.tokenProvider) {
      return;
    }
    const nextToken = (await this.tokenProvider()).trim();
    if (!nextToken) {
      throw new Error("Agent token refresh returned an empty token");
    }
    this.token = nextToken;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
