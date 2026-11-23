import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import { compressImage } from '../image';

describe('compressImage', () => {
  let largeJpegBuffer: Buffer;

  beforeAll(async () => {
    // Create a 2200x2200 JPEG fixture > 1MB with natural vector shapes
    const circles = Array.from({ length: 300 }, (_, i) =>
      `<circle cx="${(i * 43) % 2200}" cy="${(i * 67) % 2200}" r="${(i % 70) + 20}" fill="hsl(${i * 17}, 80%, 50%)" opacity="0.85" />`
    ).join('');

    const svg = `
      <svg width="2200" height="2200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff7700" />
            <stop offset="50%" stop-color="#00bb99" />
            <stop offset="100%" stop-color="#9900ff" />
          </linearGradient>
        </defs>
        <rect width="2200" height="2200" fill="url(#g)" />
        ${circles}
      </svg>
    `;

    largeJpegBuffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
      .toBuffer();
  }, 30000);

  it('Step 1: compressImage on a >1MB fixture with kind="gallery" returns a buffer under 150KB and sizeAfter < sizeBefore', async () => {
    expect(largeJpegBuffer.length).toBeGreaterThan(1024 * 1024);

    const result = await compressImage(largeJpegBuffer, 'gallery');

    expect(result.sizeBefore).toBe(largeJpegBuffer.length);
    expect(result.sizeAfter).toBeLessThan(150 * 1024); // < 150KB
    expect(result.sizeAfter).toBeLessThan(result.sizeBefore);
    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify dimensions (max width 1200)
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(1200);
  }, 20000);

  it('Step 3: compressImage with kind="thumb" returns a buffer under 35KB', async () => {
    const result = await compressImage(largeJpegBuffer, 'thumb');

    expect(result.sizeBefore).toBe(largeJpegBuffer.length);
    expect(result.sizeAfter).toBeLessThan(35 * 1024); // < 35KB
    expect(result.sizeAfter).toBeLessThan(result.sizeBefore);

    // Verify dimensions (max width 400)
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(400);
  }, 20000);
});
