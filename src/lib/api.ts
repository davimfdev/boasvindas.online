/**
 * Thin fetch wrapper for the boasvindas API.
 *
 * In production the SPA and the API share the origin https://boasvindas.online
 * (Nginx Proxy Manager routes /api/ to the API container), so the base URL is
 * empty and the session cookie is sent as a first-party cookie.
 * VITE_API_BASE_URL only exists for split-origin setups; it is a public URL,
 * never a secret.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export interface ApiErrorBody {
  code: string
  message?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? body.code)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // FormData carries its own multipart Content-Type with a boundary the browser
  // generates; declaring JSON over it would make the body unparseable.
  const isJsonBody = !!init.body && !(init.body instanceof FormData)

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  if (res.status === 204) return undefined as T

  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? { code: 'INTERNAL' })
  }

  return payload as T
}

export const api = {
  get:  <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put:  <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del:  <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
}
