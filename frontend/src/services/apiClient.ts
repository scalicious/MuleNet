/**
 * Central API Client configuration and base HTTP request wrapper.
 */

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
export const API_V1_URL = API_BASE_URL.endsWith('/api/v1') 
  ? API_BASE_URL 
  : `${API_BASE_URL}/api/v1`;

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(message: string, status = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_V1_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorJson: ApiErrorPayload | null = null;
      try {
        errorJson = await response.json();
      } catch {
        // Non-JSON response
      }

      const message = errorJson?.error?.message || `HTTP error ${response.status}: ${response.statusText}`;
      const code = errorJson?.error?.code || 'HTTP_ERROR';
      throw new ApiError(message, response.status, code, errorJson?.error?.details);
    }

    return await response.json() as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors, connection refused, or CORS errors
    const networkMessage = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(networkMessage, 0, 'NETWORK_UNAVAILABLE');
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) => 
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) => 
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
