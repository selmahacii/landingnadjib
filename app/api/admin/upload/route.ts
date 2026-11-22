import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { verifyAdminCookie } from "@/lib/admin-auth";
import { compressImage } from "@/lib/image";
import { getVariants, saveVariant } from "@/lib/sheets/variants";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value;
    if (!token || !verifyAdminCookie(token)) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as "gallery" | "thumb") || "gallery";
    const variantId = formData.get("variant_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const { buffer: compressedBuffer, sizeBefore, sizeAfter } = await compressImage(
      rawBuffer,
      kind
    );

    const ext = "webp";
    const baseName = (file.name || "image")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${Date.now()}_${baseName}.${ext}`;

    const blob = await put(filename, compressedBuffer, {
      access: "public",
      contentType: "image/webp",
    });

    if (variantId) {
      const variants = await getVariants(true);
      const target = variants.find((v) => v.variant_id === variantId);
      if (target) {
        if (kind === "thumb") {
          target.thumb_url = blob.url;
        } else {
          target.image_url = blob.url;
        }
        await saveVariant(target);
      }
    }

    revalidatePath("/");

    return NextResponse.json({
      url: blob.url,
      sizeBefore,
      sizeAfter,
    });
  } catch (error) {
    console.error("Admin media upload error:", error);
    return NextResponse.json(
      { error: "فشل تحميل الصورة أو معالجتها" },
      { status: 500 }
    );
  }
}
