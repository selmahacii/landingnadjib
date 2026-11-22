import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { _resetRateLimits } from '@/lib/admin-auth';

describe('POST /api/admin/login', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    _resetRateLimits();
    process.env = { ...originalEnv, ADMIN_SECRET_KEY: '1234' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 401 when PIN is incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ pin: 'wrong-pin' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 200 and sets admin_session cookie when PIN is correct', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ pin: '1234' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('admin_session=');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      const req = new NextRequest('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
        body: JSON.stringify({ pin: 'wrong' }),
      });
      await POST(req);
    }

    const blockedReq = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({ pin: '1234' }),
    });

    const res = await POST(blockedReq);
    expect(res.status).toBe(429);
  });
});
