const TOKEN_KEY = "nexpoint_admin_token";
const USERNAME_KEY = "nexpoint_admin_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function setAuth(token: string, username: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// API is always at /api regardless of the frontend's base path
export const API = "/api";

export async function adminFetch(path: string, options?: RequestInit) {
  const token = getToken();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}
