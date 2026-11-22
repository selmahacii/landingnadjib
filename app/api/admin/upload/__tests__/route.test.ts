/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import * as adminAuth from '@/lib/admin-auth';
import * as imageLib from '@/lib/image';
import * as blobSdk from '@vercel/blob';
import * as variantsSheets from '@/lib/sheets/variants';
import * as nextCache from 'next/cache';

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminCookie: vi.fn(),
}));

vi.mock('@/lib/image', () => ({
  compressImage: vi.fn(),
}));

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}));

vi.mock('@/lib/sheets/variants', () => ({
  getVariants: vi.fn(),
  saveVariant: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('POST /api/admin/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Step 7: without a valid admin cookie returns 401', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(false);

    const formData = new FormData();
    const file = new File(['fake-image-bytes'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('kind', 'gallery');

    const req = new NextRequest('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(imageLib.compressImage).not.toHaveBeenCalled();
    expect(blobSdk.put).not.toHaveBeenCalled();
  });

  it('Step 9: authenticated upload calls compressImage, Blob put, saveVariant, revalidatePath, returning { url, sizeBefore, sizeAfter }', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(true);

    const mockCompressedBuffer = Buffer.from('compressed-webp-bytes');
    vi.mocked(imageLib.compressImage).mockResolvedValue({
      buffer: mockCompressedBuffer,
      sizeBefore: 1200000,
      sizeAfter: 85000,
    });

    vi.mocked(blobSdk.put).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/wallet-123.webp',
      pathname: 'wallet-123.webp',
      contentType: 'image/webp',
      contentDisposition: 'inline',
    } as any);

    const mockVariant = {
      variant_id: 'var_noir',
      nom_variante_ar: 'أسود (Noir)',
      supplement_prix_dzd: 0,
      image_url: '',
      thumb_url: '',
      ordre: 1,
      actif: true,
    };
    vi.mocked(variantsSheets.getVariants).mockResolvedValue([mockVariant]);
    vi.mocked(variantsSheets.saveVariant).mockResolvedValue(undefined);

    const formData = new FormData();
    const file = new File(['image-bytes'], 'product.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('kind', 'gallery');
    formData.append('variant_id', 'var_noir');

    const baseReq = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    baseReq.headers.set('cookie', 'admin_session=valid-session');
    const req = new NextRequest(baseReq);

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toEqual({
      url: 'https://blob.vercel-storage.com/wallet-123.webp',
      sizeBefore: 1200000,
      sizeAfter: 85000,
    });

    expect(imageLib.compressImage).toHaveBeenCalled();
    expect(blobSdk.put).toHaveBeenCalledWith(
      expect.stringMatching(/\.webp$/),
      mockCompressedBuffer,
      expect.objectContaining({ access: 'public', contentType: 'image/webp' })
    );

    expect(variantsSheets.saveVariant).toHaveBeenCalledWith({
      ...mockVariant,
      image_url: 'https://blob.vercel-storage.com/wallet-123.webp',
    });

    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/');
  });
});
