import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { verifyAdminCookie } from "@/lib/admin-auth";
import { compressImage } from "@/lib/image";
import { getVariants, saveVariant } from "@/lib/sheets/variants";
import { saveMainImageUrl } from "@/lib/sheets/settings";

export async function POST(req: NextRequest) {
  let step: "auth" | "parse" | "sharp" | "blob" | "sheets" | "revalidate" = "auth";

  try {
    // 1. Authentification
    step = "auth";
    const token = req.cookies.get("admin_session")?.value;
    if (!token || !verifyAdminCookie(token)) {
      console.warn("[Upload API] Auth failed: invalid or expired admin_session cookie");
      return NextResponse.json(
        {
          ok: false,
          error: "غير مصرح لك بالوصول: جلسة الأدمن غير صالحة أو منتهية الصلاحية",
          step: "auth",
        },
        { status: 401 }
      );
    }

    // 2. Traitement du formulaire et parsing
    step = "parse";
    const formData = await req.formData().catch((err) => {
      throw new Error(`تعذر قراءة بيانات النموذج: ${err?.message || err}`);
    });
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as "gallery" | "thumb") || "gallery";
    const rawVariantId = (formData.get("variant_id") as string | null)?.trim() || "";
    const variantId = rawVariantId && rawVariantId !== "main" ? rawVariantId : "";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "لم يتم اختيار أي ملف للرفع أو الملف تالف",
          step: "parse",
        },
        { status: 400 }
      );
    }

    // 3. Compression Sharp vers WebP
    step = "sharp";
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const { buffer: compressedBuffer, sizeBefore, sizeAfter } = await compressImage(
      rawBuffer,
      kind
    ).catch((err) => {
      throw new Error(`فشل ضغط وتحويل الصورة بواسطة Sharp: ${err?.message || err}`);
    });

    const ext = "webp";
    const baseName = (file.name || "image")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${Date.now()}_${baseName}.${ext}`;

    // 4. Upload vers Vercel Blob
    step = "blob";
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[Upload API] Missing BLOB_READ_WRITE_TOKEN environment variable");
      return NextResponse.json(
        {
          ok: false,
          error:
            "متغير BLOB_READ_WRITE_TOKEN غير معرّف في بيئة Vercel. يرجى تفعيل Vercel Blob في لوحة التحكم (Storage > Create Database > Blob > Connect to Project).",
          step: "blob",
        },
        { status: 500 }
      );
    }

    const blob = await put(filename, compressedBuffer, {
      access: "public",
      contentType: "image/webp",
    }).catch((err) => {
      throw new Error(`فشل رفع الصورة إلى Vercel Blob: ${err?.message || err}`);
    });

    // 5. Sauvegarde dans Google Sheets
    step = "sheets";
    if (variantId) {
      // Cas 1 : photo d'une variante spécifique
      const variants = await getVariants(true);
      const target = variants.find(
        (v) => v.variant_id.toLowerCase() === variantId.toLowerCase()
      );
      if (target) {
        if (kind === "thumb") {
          target.thumb_url = blob.url;
        } else {
          target.image_url = blob.url;
        }
        await saveVariant(target);
      } else {
        // Nouvelle variante créée ou inconnue
        await saveVariant({
          variant_id: variantId,
          nom_variante_ar: variantId,
          supplement_prix_dzd: 0,
          image_url: kind === "thumb" ? "" : blob.url,
          thumb_url: kind === "thumb" ? blob.url : "",
          ordre: 99,
          actif: true,
        });
      }
    } else {
      // Cas 2 : photo principale du produit (sans variante ou variant_id="main")
      await saveMainImageUrl(blob.url);

      // Si la première variante n'a pas encore de photo, lui assigner aussi pour l'affichage initial
      try {
        const variants = await getVariants(true);
        if (variants.length > 0 && !variants[0].image_url) {
          variants[0].image_url = blob.url;
          await saveVariant(variants[0]);
        }
      } catch (e) {
        console.warn("[Upload API] Could not mirror main image to first variant:", e);
      }
    }

    // 6. Revalidation du cache Next.js
    step = "revalidate";
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/admin/media");
    revalidatePath("/admin/settings");

    return NextResponse.json({
      ok: true,
      url: blob.url,
      sizeBefore,
      sizeAfter,
      variantId: variantId || "main",
      kind,
      step: "revalidate",
    });
  } catch (error: any) {
    console.error(`[Upload API] Fatal error at step '${step}':`, error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "حدث خطأ غير متوقع أثناء معالجة ورفع الصورة",
        step,
      },
      { status: 500 }
    );
  }
}
