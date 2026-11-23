import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as adminAuth from '@/lib/admin-auth';
import * as deliverySheets from '@/lib/sheets/delivery';
import * as nextCache from 'next/cache';

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminCookie: vi.fn(),
}));

vi.mock('@/lib/sheets/delivery', () => ({
  saveDeliveryTariff: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('POST /api/admin/delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('without a valid admin cookie returns 401 and never calls saveDeliveryTariff', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(false);

    const req = new NextRequest('http://localhost:3000/api/admin/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wilaya_code: '16',
        wilaya_ar: 'الجزائر',
        prix_domicile: 400,
        prix_stopdesk: 250,
        actif: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(deliverySheets.saveDeliveryTariff).not.toHaveBeenCalled();
    expect(nextCache.revalidatePath).not.toHaveBeenCalled();
  });

  it('with a valid cookie, calls saveDeliveryTariff with the posted body and calls revalidatePath("/")', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(true);

    const tariff = {
      wilaya_code: '16',
      wilaya_ar: 'الجزائر',
      prix_domicile: 450,
      prix_stopdesk: 280,
      actif: true,
    };

    const req = new NextRequest('http://localhost:3000/api/admin/delivery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'admin_session=valid-signed-token',
      },
      body: JSON.stringify(tariff),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(deliverySheets.saveDeliveryTariff).toHaveBeenCalledWith(tariff);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/');
  });
});
