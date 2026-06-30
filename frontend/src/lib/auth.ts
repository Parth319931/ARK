/**
 * frontend/src/lib/auth.ts
 * Helpers for reading/writing/clearing the JWT in localStorage.
 *
 * The token is the ONLY source of identity on the frontend. Never store
 * user_id separately and trust it — always re-derive the user from
 * GET /api/auth/me using this token.
 */

const TOKEN_KEY = "artharakshak_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return !!getToken();
}