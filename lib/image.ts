import sharp from "sharp";

export interface CompressionResult {
  buffer: Buffer;
  sizeBefore: number;
  sizeAfter: number;
}

export async function compressImage(
  buffer: Buffer,
  kind: "gallery" | "thumb"
): Promise<CompressionResult> {
  const sizeBefore = buffer.length;
  const targetWidth = kind === "gallery" ? 1200 : 400;

  const compressed = await sharp(buffer)
    .rotate() // auto-orient based on EXIF
    .resize({
      width: targetWidth,
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    buffer: compressed,
    sizeBefore,
    sizeAfter: compressed.length,
  };
}
