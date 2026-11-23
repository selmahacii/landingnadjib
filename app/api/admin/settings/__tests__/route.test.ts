import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as adminAuth from '@/lib/admin-auth';
import * as settingsSheets from '@/lib/sheets/settings';
import * as nextCache from 'next/cache';

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminCookie: vi.fn(),
}));

vi.mock('@/lib/sheets/settings', () => ({
  saveSiteSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('POST /api/admin/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('without a valid admin cookie returns 401 and never calls saveSiteSettings', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(false);

    const req = new NextRequest('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        header_bg_color: '#0f172a',
        header_text_color: '#ffffff',
        header_text_ar: 'تخفيضات حصرية اليوم فقط',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(settingsSheets.saveSiteSettings).not.toHaveBeenCalled();
    expect(nextCache.revalidatePath).not.toHaveBeenCalled();
  });

  it('with a valid cookie, calls saveSiteSettings with the posted body and calls revalidatePath("/")', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(true);

    const settings = {
      header_bg_color: '#0f172a',
      header_text_color: '#ffffff',
      header_text_ar: 'تخفيضات حصرية اليوم فقط',
    };

    const req = new NextRequest('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'admin_session=valid-signed-token',
      },
      body: JSON.stringify(settings),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(settingsSheets.saveSiteSettings).toHaveBeenCalledWith(settings);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/');
  });
});
