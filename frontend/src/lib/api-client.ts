import { clearAccessToken, getAccessToken } from "@/lib/auth";

export type HealthResponse = {
  status: string;
  database: string;
};

export type PromptCreateRequest = {
  name: string;
  content: string;
  tag?: string;
  metadata?: Record<string, unknown>;
};

export type PromptLookupQuery = {
  name?: string;
  tag?: string;
  latest?: boolean;
  limit?: number;
};

export type PromptUpdateRequest = {
  content?: string;
  tag?: string | null;
};

export type PromptVersionResponse = {
  id: number;
  prompt_id: number;
  name: string;
  content: string;
  version: number;
  tag?: string;
  created_at: string;
  updated_at: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type UserResponse = {
  id: number;
  email: string;
  created_at: string;
};

export type ApiKeyCreateRequest = {
  name: string;
};

export type ApiKeyMetadataResponse = {
  id: number;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
};

export type ApiKeyCreateResponse = ApiKeyMetadataResponse & {
  api_key: string;
};

type ApiRequestOptions = RequestInit & {
  skipAuth?: boolean;
  suppressRedirectOn401?: boolean;
};

export class PromptApiClient {
  constructor(private readonly baseUrl: string) {}

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/api/v1/health", { skipAuth: true });
  }

  async register(payload: RegisterRequest): Promise<UserResponse> {
    return this.request<UserResponse>("/api/v1/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      skipAuth: true,
      suppressRedirectOn401: true
    });
  }

  async login(payload: LoginRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      skipAuth: true,
      suppressRedirectOn401: true
    });
  }

  async me(): Promise<UserResponse> {
    return this.request<UserResponse>("/api/v1/auth/me");
  }

  async listApiKeys(): Promise<ApiKeyMetadataResponse[]> {
    return this.request<ApiKeyMetadataResponse[]>("/api/v1/auth/api-keys");
  }

  async createApiKey(payload: ApiKeyCreateRequest): Promise<ApiKeyCreateResponse> {
    return this.request<ApiKeyCreateResponse>("/api/v1/auth/api-keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  async deleteApiKey(id: number): Promise<void> {
    await this.request<void>(`/api/v1/auth/api-keys/${id}`, {
      method: "DELETE"
    });
  }

  async getPrompts(query: PromptLookupQuery): Promise<PromptVersionResponse[]> {
    const params = new URLSearchParams();
    if (query.name?.trim()) {
      params.set("name", query.name.trim());
    }
    if (query.tag) {
      params.set("tag", query.tag);
    }
    if (query.latest) {
      params.set("latest", "true");
    }
    if (query.limit && query.limit > 0) {
      params.set("limit", String(query.limit));
    }

    const queryString = params.toString();
    const path = queryString ? `/api/v1/prompts?${queryString}` : "/api/v1/prompts";
    return this.request<PromptVersionResponse[]>(path);
  }

  async createPrompt(payload: PromptCreateRequest): Promise<PromptVersionResponse> {
    return this.request<PromptVersionResponse>("/api/v1/prompts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  async updatePromptVersion(
    promptVersionId: number,
    payload: PromptUpdateRequest
  ): Promise<PromptVersionResponse> {
    return this.request<PromptVersionResponse>(`/api/v1/prompts/${promptVersionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  async deletePromptVersion(promptVersionId: number): Promise<void> {
    await this.request<void>(`/api/v1/prompts/${promptVersionId}`, {
      method: "DELETE"
    });
  }

  private async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { skipAuth = false, suppressRedirectOn401 = false, headers, ...init } = options;

    const requestHeaders = new Headers(headers);
    if (!skipAuth) {
      const token = getAccessToken();
      if (token) {
        requestHeaders.set("Authorization", `Bearer ${token}`);
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: requestHeaders
    });

    if (response.status === 401) {
      clearAccessToken();
      if (
        !suppressRedirectOn401 &&
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.assign("/login");
      }
    }

    if (!response.ok) {
      let message = `API request failed (${response.status})`;
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) {
          message = body.detail;
        }
      } catch {
        // Use default message when response body is not JSON.
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const promptApiClient = new PromptApiClient(apiBaseUrl);
