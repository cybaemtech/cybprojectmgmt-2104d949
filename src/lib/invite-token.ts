// Lightweight invite-token helpers. The token is a base64url-encoded JSON
// payload containing the invited email and an expiry timestamp (ms epoch).
// Links are valid for 30 minutes from creation.

export const INVITE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface InvitePayload {
  email: string;
  exp: number; // ms epoch when the link expires
}

const b64urlEncode = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64urlDecode = (s: string) => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return decodeURIComponent(escape(atob(b64)));
};

export function createInviteToken(email: string, ttlMs: number = INVITE_TTL_MS): string {
  const payload: InvitePayload = { email: email.toLowerCase(), exp: Date.now() + ttlMs };
  return b64urlEncode(JSON.stringify(payload));
}

export function parseInviteToken(token: string): InvitePayload | null {
  try {
    const data = JSON.parse(b64urlDecode(token)) as InvitePayload;
    if (!data || typeof data.email !== "string" || typeof data.exp !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function isInviteExpired(payload: InvitePayload): boolean {
  return Date.now() > payload.exp;
}

export function buildInviteUrl(origin: string, email: string): string {
  const token = createInviteToken(email);
  return `${origin}/login?invite=${token}`;
}
