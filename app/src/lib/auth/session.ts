// Shared-household session tokens.
//
// Auth is enabled by setting FINFLOW_PASSWORD. Both users share one password
// but sign in with their own name, which is embedded in the session token so
// uploads and snapshots can be attributed to a person.
//
// Tokens are HMAC-SHA256 signed values of the form
//   base64url(name).expiresAtMs.base64url(signature)
// signed with FINFLOW_SECRET (or, if unset, FINFLOW_PASSWORD). Uses the Web
// Crypto API so the same code runs in both the Node runtime (API routes) and
// the Edge runtime (middleware/proxy).

export const SESSION_COOKIE = 'finflow_session';
export const SESSION_DURATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export interface Session {
  name: string;
  expiresAt: number;
}

export function isAuthEnabled(): boolean {
  return Boolean(process.env.FINFLOW_PASSWORD);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.FINFLOW_PASSWORD;
  if (!expected) return false;
  // Length-safe comparison to avoid trivial timing leaks
  if (password.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function signingSecret(): string {
  return process.env.FINFLOW_SECRET || process.env.FINFLOW_PASSWORD || '';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(payload: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return new Uint8Array(signature);
}

export async function createSessionToken(name: string, expiresAt?: number): Promise<string> {
  const exp = expiresAt ?? Date.now() + SESSION_DURATION_MS;
  const encodedName = toBase64Url(new TextEncoder().encode(name));
  const payload = `${encodedName}.${exp}`;
  const signature = toBase64Url(await hmac(payload));
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedName, expStr, signature] = parts;

  const expiresAt = parseInt(expStr, 10);
  if (isNaN(expiresAt) || expiresAt < Date.now()) return null;

  let expected: string;
  let name: string;
  try {
    expected = toBase64Url(await hmac(`${encodedName}.${expStr}`));
    name = new TextDecoder().decode(fromBase64Url(encodedName));
  } catch {
    return null;
  }

  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return null;

  return { name, expiresAt };
}

export function getTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/**
 * Resolve the signed-in user's name from a request. Returns null when auth
 * is disabled or the session is missing/invalid. API routes use this for
 * attribution (uploaded_by / updated_by) — access control itself is enforced
 * centrally in middleware.
 */
export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  if (!isAuthEnabled()) return null;
  const token = getTokenFromCookieHeader(request.headers.get('cookie'));
  return verifySessionToken(token);
}
