/// <reference types="vite/client" />
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Shared promise so concurrent 401s all wait on a single refresh call.
let pendingRefresh: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const res = await fetch(`${BASE_URL}/reddit/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      return data.accessToken
    }
  } catch {
    // network error — fall through
  }

  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  return null
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const makeRequest = (token: string | null) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }
    return fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
  }

  const token = localStorage.getItem('accessToken')
  let response = await makeRequest(token)
  let data = await response.json()

  // On 401, attempt one token refresh then retry — but never for the refresh
  // endpoint itself to avoid an infinite loop.
  if (response.status === 401 && !endpoint.includes('/reddit/auth/refresh')) {
    if (!pendingRefresh) {
      pendingRefresh = refreshAccessToken().finally(() => {
        pendingRefresh = null
      })
    }
    const newToken = await pendingRefresh

    if (newToken) {
      response = await makeRequest(newToken)
      data = await response.json()
    }
  }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
  }

  return data
}
