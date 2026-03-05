import type { ApiResponse, HttpClientOptions } from "../types/index.js";

export class HttpClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.timeout = options.timeout ?? 20_000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path);
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: { idempotencyKey?: string },
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
    options?: { idempotencyKey?: string },
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const requestId = uuidv4();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    };

    if (options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
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

