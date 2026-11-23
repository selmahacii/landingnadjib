import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as adminAuth from '@/lib/admin-auth';
import * as offersSheets from '@/lib/sheets/offers';
import * as nextCache from 'next/cache';

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminCookie: vi.fn(),
}));

vi.mock('@/lib/sheets/offers', () => ({
  saveOffer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('POST /api/admin/offers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unauthenticated request returns 401', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(false);

    const req = new NextRequest('http://localhost:3000/api/admin/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer_id: 'pack_1',
        titre_ar: 'قطعة واحدة',
        quantite: 1,
        prix_dzd: 2000,
        prix_barre_dzd: 2800,
        badge_ar: '',
        livraison_gratuite: false,
        par_defaut: false,
        ordre: 1,
        actif: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(offersSheets.saveOffer).not.toHaveBeenCalled();
    expect(nextCache.revalidatePath).not.toHaveBeenCalled();
  });

  it('authenticated request calls saveOffer and revalidatePath("/")', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(true);

    const offer = {
      offer_id: 'pack_3',
      titre_ar: '3 قطع (3)',
      quantite: 3,
      prix_dzd: 4800,
      prix_barre_dzd: 6000,
      badge_ar: 'عرض مميز',
      livraison_gratuite: true,
      par_defaut: false,
      ordre: 3,
      actif: true,
    };

    const req = new NextRequest('http://localhost:3000/api/admin/offers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: 'admin_session=valid-signed-token',
      },
      body: JSON.stringify(offer),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(offersSheets.saveOffer).toHaveBeenCalledWith(offer);
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/');
  });
});
