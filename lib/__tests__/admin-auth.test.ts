import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signAdminCookie, verifyAdminCookie, checkPinRateLimit, _resetRateLimits } from '../admin-auth';

describe('Admin auth cookie verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, ADMIN_SECRET_KEY: 'super-secret-pin-123' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true for a freshly signed valid admin cookie', () => {
    const cookie = signAdminCookie();
    expect(verifyAdminCookie(cookie)).toBe(true);
  });

  it('returns false for a cookie signed with a different secret', () => {
    process.env.ADMIN_SECRET_KEY = 'secret-A';
    const cookieFromA = signAdminCookie();

    process.env.ADMIN_SECRET_KEY = 'secret-B';
    expect(verifyAdminCookie(cookieFromA)).toBe(false);
  });

  it('returns false for an expired cookie', () => {
    const cookie = signAdminCookie();
    // Advance time by 25 hours (expiry is 24h)
    const futureTime = Date.now() + 25 * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockReturnValue(futureTime);

    expect(verifyAdminCookie(cookie)).toBe(false);
    vi.restoreAllMocks();
  });

  it('returns false for malformed or empty cookie', () => {
    expect(verifyAdminCookie('')).toBe(false);
    expect(verifyAdminCookie('invalid.format')).toBe(false);
    expect(verifyAdminCookie('not-a-cookie')).toBe(false);
  });
});

describe('checkPinRateLimit', () => {
  beforeEach(() => {
    _resetRateLimits();
  });

  it('returns true for first 5 attempts, false on the 6th within 15 minutes for the same IP, and true for another IP', () => {
    const ipA = '192.168.1.100';
    const ipB = '192.168.1.200';

    // 5 attempts for ipA should all be allowed
    for (let i = 0; i < 5; i++) {
      expect(checkPinRateLimit(ipA)).toBe(true);
    }

    // 6th attempt for ipA should be blocked
    expect(checkPinRateLimit(ipA)).toBe(false);

    // Another IP should still be allowed
    expect(checkPinRateLimit(ipB)).toBe(true);
  });
});

