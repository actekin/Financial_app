import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SESSION_COOKIE,
  checkPassword,
  createSessionToken,
  getTokenFromCookieHeader,
  isAuthEnabled,
  verifySessionToken,
} from '../session';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.FINFLOW_PASSWORD = 'household-secret';
  delete process.env.FINFLOW_SECRET;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('isAuthEnabled', () => {
  it('is enabled when FINFLOW_PASSWORD is set', () => {
    expect(isAuthEnabled()).toBe(true);
  });

  it('is disabled when FINFLOW_PASSWORD is unset', () => {
    delete process.env.FINFLOW_PASSWORD;
    expect(isAuthEnabled()).toBe(false);
  });
});

describe('checkPassword', () => {
  it('accepts the correct password', () => {
    expect(checkPassword('household-secret')).toBe(true);
  });

  it('rejects wrong passwords', () => {
    expect(checkPassword('wrong')).toBe(false);
    expect(checkPassword('household-secreT')).toBe(false);
    expect(checkPassword('')).toBe(false);
  });

  it('rejects everything when auth is disabled', () => {
    delete process.env.FINFLOW_PASSWORD;
    expect(checkPassword('household-secret')).toBe(false);
  });
});

describe('session tokens', () => {
  it('round-trips a valid token', async () => {
    const token = await createSessionToken('Arda');
    const session = await verifySessionToken(token);
    expect(session?.name).toBe('Arda');
    expect(session!.expiresAt).toBeGreaterThan(Date.now());
  });

  it('supports names with unicode characters', async () => {
    const token = await createSessionToken('Ayşe Çetin');
    const session = await verifySessionToken(token);
    expect(session?.name).toBe('Ayşe Çetin');
  });

  it('rejects expired tokens', async () => {
    const token = await createSessionToken('Arda', Date.now() - 1000);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it('rejects tampered tokens', async () => {
    const token = await createSessionToken('Arda');
    const [name, exp, sig] = token.split('.');
    // Change the embedded name without re-signing
    const otherName = Buffer.from('Eve').toString('base64url');
    expect(await verifySessionToken(`${otherName}.${exp}.${sig}`)).toBeNull();
    // Extend the expiry without re-signing
    expect(await verifySessionToken(`${name}.${Number(exp) + 9999999}.${sig}`)).toBeNull();
  });

  it('rejects tokens signed with a different password', async () => {
    const token = await createSessionToken('Arda');
    process.env.FINFLOW_PASSWORD = 'different-password';
    expect(await verifySessionToken(token)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken('')).toBeNull();
    expect(await verifySessionToken('a.b')).toBeNull();
    expect(await verifySessionToken('not.a.token')).toBeNull();
  });
});

describe('getTokenFromCookieHeader', () => {
  it('extracts the session cookie among others', () => {
    const header = `theme=dark; ${SESSION_COOKIE}=abc.123.def; other=1`;
    expect(getTokenFromCookieHeader(header)).toBe('abc.123.def');
  });

  it('returns null when missing', () => {
    expect(getTokenFromCookieHeader(null)).toBeNull();
    expect(getTokenFromCookieHeader('theme=dark')).toBeNull();
  });
});
