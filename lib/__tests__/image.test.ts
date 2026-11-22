import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import { compressImage } from '../image';

describe('compressImage', () => {
  let largeJpegBuffer: Buffer;

  beforeAll(async () => {
    // Create a 2000x2000 JPEG fixture > 1MB
    const circles = Array.from({ length: 350 }, (_, i) =>
      `<circle cx="${(i * 37) % 2000}" cy="${(i * 59) % 2000}" r="${(i % 60) + 15}" fill="hsl(${i * 13}, 75%, 50%)" opacity="0.8" />`
    ).join('');

    const svg = `
      <svg width="2000" height="2000" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff8800" />
            <stop offset="50%" stop-color="#00aa88" />
            <stop offset="100%" stop-color="#8800ff" />
          </linearGradient>
        </defs>
        <rect width="2000" height="2000" fill="url(#g)" />
        ${circles}
      </svg>
    `;

    largeJpegBuffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 100 })
      .toBuffer();

    // Verify it is indeed > 1MB
    if (largeJpegBuffer.length <= 1024 * 1024) {
      // Pad if needed or bump quality
      largeJpegBuffer = await sharp({
        create: {
          width: 2500,
          height: 2500,
          channels: 3,
          background: { r: 255, g: 100, b: 50 },
        },
      })
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png({ compressionLevel: 0 })
        .toBuffer();
    }
  });

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
  });

  it('Step 3: compressImage with kind="thumb" returns a buffer under 35KB', async () => {
    const result = await compressImage(largeJpegBuffer, 'thumb');

    expect(result.sizeBefore).toBe(largeJpegBuffer.length);
    expect(result.sizeAfter).toBeLessThan(35 * 1024); // < 35KB
    expect(result.sizeAfter).toBeLessThan(result.sizeBefore);

    // Verify dimensions (max width 400)
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(400);
  });
});
