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
import * as settingsSheets from '@/lib/sheets/settings';
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

vi.mock('@/lib/sheets/settings', () => ({
  saveMainImageUrl: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('POST /api/admin/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = 'mock-token';
  });

  it('without a valid admin cookie returns 401 with step=auth', async () => {
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
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.step).toBe('auth');
    expect(imageLib.compressImage).not.toHaveBeenCalled();
    expect(blobSdk.put).not.toHaveBeenCalled();
  });

  it('without a file returns 400 with step=parse', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(true);

    const formData = new FormData();
    const baseReq = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    baseReq.headers.set('cookie', 'admin_session=valid-session');
    const req = new NextRequest(baseReq);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.step).toBe('parse');
  });

  it('without BLOB_READ_WRITE_TOKEN returns 500 with step=blob and clear advice', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(true);
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const mockCompressedBuffer = Buffer.from('compressed-bytes');
    vi.mocked(imageLib.compressImage).mockResolvedValue({
      buffer: mockCompressedBuffer,
      sizeBefore: 500000,
      sizeAfter: 80000,
    });

    const formData = new FormData();
    formData.append('file', new File(['img'], 'test.png', { type: 'image/png' }));
    const baseReq = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    baseReq.headers.set('cookie', 'admin_session=valid-session');
    const req = new NextRequest(baseReq);

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.step).toBe('blob');
    expect(data.error).toContain('BLOB_READ_WRITE_TOKEN');
  });

  it('authenticated upload for variant calls compressImage, Blob put, saveVariant, revalidatePath', async () => {
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

    expect(data).toMatchObject({
      ok: true,
      url: 'https://blob.vercel-storage.com/wallet-123.webp',
      sizeBefore: 1200000,
      sizeAfter: 85000,
      variantId: 'var_noir',
      step: 'revalidate',
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

    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/', 'layout');
    expect(nextCache.revalidatePath).toHaveBeenCalledWith('/admin/media');
  });

  it('authenticated upload for main photo (variant_id="main" or empty) calls saveMainImageUrl', async () => {
    vi.mocked(adminAuth.verifyAdminCookie).mockReturnValue(true);

    const mockCompressedBuffer = Buffer.from('compressed-webp-bytes');
    vi.mocked(imageLib.compressImage).mockResolvedValue({
      buffer: mockCompressedBuffer,
      sizeBefore: 900000,
      sizeAfter: 75000,
    });

    vi.mocked(blobSdk.put).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/main-photo.webp',
      pathname: 'main-photo.webp',
      contentType: 'image/webp',
      contentDisposition: 'inline',
    } as any);

    vi.mocked(settingsSheets.saveMainImageUrl).mockResolvedValue(undefined);
    vi.mocked(variantsSheets.getVariants).mockResolvedValue([]);

    const formData = new FormData();
    const file = new File(['image-bytes'], 'hero.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    formData.append('kind', 'gallery');
    formData.append('variant_id', 'main');

    const baseReq = new Request('http://localhost:3000/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    baseReq.headers.set('cookie', 'admin_session=valid-session');
    const req = new NextRequest(baseReq);

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.url).toBe('https://blob.vercel-storage.com/main-photo.webp');
    expect(settingsSheets.saveMainImageUrl).toHaveBeenCalledWith(
      'https://blob.vercel-storage.com/main-photo.webp'
    );
  });
});
