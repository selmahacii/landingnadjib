"use client";

import React, { useState } from "react";
import type { Variant } from "@/lib/sheets/variants";

interface MediaUploaderProps {
  initialVariants: Variant[];
  initialMainImage?: string;
}

interface UploadResult {
  url: string;
  sizeBefore: number;
  sizeAfter: number;
  variantId?: string;
  kind?: string;
  step?: string;
}

interface VariantUploadState {
  loading: boolean;
  loadingMessage: string;
  error: string | null;
  errorStep: string | null;
  success: UploadResult | null;
}

/**
 * Pre-compress large images on the client (Canvas -> JPEG < 1.5MB)
 * to avoid Vercel 413 "Function Payload Too Large" error (4.5MB limit).
 */
async function precompressImageOnClient(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const MAX_DIM = 2000;
        let { width, height } = img;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const precompressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );
            resolve(precompressedFile);
          },
          "image/jpeg",
          0.82
        );
      } catch (err) {
        console.warn("Client precompression failed, falling back to original file:", err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} ميغابايت`;
  }
  return `${Math.round(bytes / 1024)} كيلوبايت`;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  initialVariants,
  initialMainImage = "",
}) => {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [mainImageUrl, setMainImageUrl] = useState<string>(initialMainImage);

  // Main Image Upload State
  const [mainLoading, setMainLoading] = useState(false);
  const [mainLoadingMsg, setMainLoadingMsg] = useState("");
  const [mainError, setMainError] = useState<{ message: string; step?: string } | null>(null);
  const [mainSuccess, setMainSuccess] = useState<UploadResult | null>(null);

  // Variant Upload States (keyed by variant_id)
  const [variantStates, setVariantStates] = useState<Record<string, VariantUploadState>>({});

  const defaultVariantState: VariantUploadState = {
    loading: false,
    loadingMessage: "",
    error: null,
    errorStep: null,
    success: null,
  };

  const setVariantState = (variantId: string, partial: Partial<VariantUploadState>) => {
    setVariantStates((prev) => {
      const current = prev[variantId] || defaultVariantState;
      return {
        ...prev,
        [variantId]: {
          ...current,
          ...partial,
        },
      };
    });
  };

  /**
   * Unified upload worker calling /api/admin/upload
   */
  const executeUpload = async (
    file: File,
    kind: "gallery" | "thumb",
    variantId: string, // "" or "main" for main product image
    onProgress: (msg: string) => void
  ): Promise<UploadResult> => {
    let fileToUpload = file;
    if (file.size > 1.5 * 1024 * 1024) {
      onProgress("جاري تقليص الحجم في المتصفح لتفادي قيود الرفع...");
      fileToUpload = await precompressImageOnClient(file);
    }

    onProgress("جاري الرفع والتحويل بصيغة WebP الحديثة...");

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("kind", kind);
    formData.append("variant_id", variantId);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      const errorMsg = data.error || `فشل الاتصال بالخادم (HTTP ${res.status})`;
      const step = data.step || "unknown";
      const err = new Error(errorMsg) as Error & { step?: string };
      err.step = step;
      throw err;
    }

    return {
      url: data.url,
      sizeBefore: data.sizeBefore,
      sizeAfter: data.sizeAfter,
      variantId,
      kind,
      step: data.step,
    };
  };

  /**
   * Handler for Main Product Image Upload
   */
  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMainLoading(true);
    setMainError(null);
    setMainSuccess(null);

    try {
      const result = await executeUpload(file, "gallery", "main", (msg) =>
        setMainLoadingMsg(msg)
      );
      setMainSuccess(result);
      setMainImageUrl(result.url);

      // If first variant has no image, mirror it locally
      setVariants((prev) => {
        if (prev.length > 0 && !prev[0].image_url) {
          const next = [...prev];
          next[0] = { ...next[0], image_url: result.url };
          return next;
        }
        return prev;
      });
    } catch (err: any) {
      setMainError({
        message: err.message || "حدث خطأ غير متوقع أثناء الرفع",
        step: err.step,
      });
    } finally {
      setMainLoading(false);
      setMainLoadingMsg("");
      e.target.value = ""; // Reset input
    }
  };

  /**
   * Handler for specific Variant Upload
   */
  const handleVariantFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    variantId: string,
    kind: "gallery" | "thumb"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVariantState(variantId, {
      loading: true,
      loadingMessage: "جاري المعالجة...",
      error: null,
      errorStep: null,
      success: null,
    });

    try {
      const result = await executeUpload(file, kind, variantId, (msg) => {
        setVariantState(variantId, { loadingMessage: msg });
      });

      setVariantState(variantId, {
        loading: false,
        loadingMessage: "",
        success: result,
        error: null,
      });

      // Update local variant state
      setVariants((prev) =>
        prev.map((v) =>
          v.variant_id.toLowerCase() === variantId.toLowerCase()
            ? {
                ...v,
                [kind === "thumb" ? "thumb_url" : "image_url"]: result.url,
              }
            : v
        )
      );
    } catch (err: any) {
      setVariantState(variantId, {
        loading: false,
        loadingMessage: "",
        error: err.message || "حدث خطأ أثناء رفع صورة المتغير",
        errorStep: err.step || "unknown",
      });
    } finally {
      e.target.value = ""; // Reset input
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* SECTION 1: MAIN PRODUCT IMAGE */}
      <div className="bg-white shadow rounded-xl p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full mb-1">
              الأساس للواجهة الرئيسية
            </span>
            <h2 className="text-xl font-extrabold text-gray-900">
              1. الصورة الرئيسية للمنتج (معرض الصفحة الرئيسية)
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              هذه الصورة تظهر كأول صورة في المعرض (Gallery) في صفحة الهبوط وتُعرض لجميع الزوار تلقائياً.
            </p>
          </div>
        </div>

        {/* Main Image Error Banner */}
        {mainError && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-800 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-900">❌ فشل رفع الصورة الرئيسية:</span>
              {mainError.step && (
                <span className="bg-red-200 text-red-900 text-xs font-mono px-2 py-0.5 rounded font-bold">
                  الخطوة: {mainError.step}
                </span>
              )}
            </div>
            <p className="text-sm pr-2 text-red-700 font-medium">{mainError.message}</p>
            {mainError.step === "blob" && (
              <p className="text-xs text-red-600 bg-red-100 p-2 rounded mt-2">
                💡 <strong>تنبيه للمسؤول:</strong> تأكد من تفعيل Vercel Blob في لوحة Vercel الخاصة بمشروعك (Storage &gt; Create Database &gt; Blob &gt; Connect to Project).
              </p>
            )}
          </div>
        )}

        {/* Main Image Success Banner */}
        {mainSuccess && (
          <div className="mb-4 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-800">✅ تم رفع وضغط الصورة بنجاح وتحديث المتجر فوراً!</span>
                <span className="text-xs bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                  توفير -{Math.round((1 - mainSuccess.sizeAfter / mainSuccess.sizeBefore) * 100)}%
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                الحجم: <span className="font-mono">{formatBytes(mainSuccess.sizeBefore)}</span> ← بعد التحويل لـ WebP:{" "}
                <span className="font-mono font-bold">{formatBytes(mainSuccess.sizeAfter)}</span>
              </p>
              <a
                href={mainSuccess.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-600 hover:underline mt-1 inline-block font-mono"
              >
                رابط الصورة: {mainSuccess.url} ↗
              </a>
            </div>
            {mainSuccess.url && (
              <div className="relative w-16 h-16 rounded-lg border overflow-hidden bg-white shrink-0 shadow-sm">
                <img
                  src={mainSuccess.url}
                  alt="Main Product"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* Main Image Preview & Direct Upload Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="relative aspect-square w-full max-w-[200px] mx-auto bg-neutral-200 rounded-xl overflow-hidden border border-gray-300 shadow-sm flex items-center justify-center">
            {mainImageUrl ? (
              <img
                src={mainImageUrl}
                alt="الصورة الرئيسية"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-3 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium">لا توجد صورة حالياً</span>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="font-bold text-gray-800 text-sm">
              {mainImageUrl ? "استبدال الصورة الرئيسية الحالية" : "اختيار صورة رئيسية للمنتج"}
            </h3>
            <p className="text-xs text-gray-500">
              صيغ مدعومة: JPG، PNG، WebP. يتم ضغط الصورة تلقائياً لتكون أقل من 150 كيلوبايت مع حماية سرعة تحميل الصفحة في الجزائر.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="file"
                id="main-image-input"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleMainImageChange}
                disabled={mainLoading}
                className="hidden"
              />
              <label
                htmlFor="main-image-input"
                className={`inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-5 rounded-lg shadow cursor-pointer transition text-sm ${
                  mainLoading ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {mainLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>{mainLoadingMsg || "جاري رفع ومعالجة الصورة..."}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>{mainImageUrl ? "اختر صورة جديدة للاستبدال" : "رفع الصورة الرئيسية"}</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: VARIANT IMAGES (COLORS) */}
      <div className="bg-white shadow rounded-xl p-6 border border-gray-200">
        <div className="mb-6">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full mb-1">
            مخصصة لكل لون
          </span>
          <h2 className="text-xl font-extrabold text-gray-900">
            2. صور متغيرات وألوان المنتج (5 ألوان)
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            ارفع صورة لكل لون على حدة. عندما يضغط الزبون على اللون في صفحة المنتج، تظهر صورته المخصصة في المعرض.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {variants.map((v) => {
            const state = variantStates[v.variant_id] || {
              loading: false,
              loadingMessage: "",
              error: null,
              errorStep: null,
              success: null,
            };

            const galleryInputId = `variant-gallery-${v.variant_id}`;
            const thumbInputId = `variant-thumb-${v.variant_id}`;

            return (
              <div
                key={v.variant_id}
                className="border-2 border-gray-200 hover:border-amber-400 rounded-xl p-4 bg-gray-50/60 shadow-sm transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Variant Header */}
                  <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <div>
                      <h4 className="font-bold text-base text-gray-900">{v.nom_variante_ar}</h4>
                      <p className="text-xs text-gray-400 font-mono">{v.variant_id}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                      ترتيب: #{v.ordre}
                    </span>
                  </div>

                  {/* Image Previews */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-20 h-20 bg-neutral-200 rounded-lg overflow-hidden border border-gray-300 shrink-0 flex items-center justify-center">
                      {v.image_url ? (
                        <img
                          src={v.image_url}
                          alt={v.nom_variante_ar}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400 text-center px-1">
                          بدون صورة
                        </span>
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-gray-700">الصورة الرئيسية للون:</p>
                      <p className="text-gray-500 truncate max-w-[170px]">
                        {v.image_url ? "✅ مرفوعة ومحفوظة" : "❌ غير محددة بعد"}
                      </p>
                      {v.thumb_url && (
                        <p className="text-blue-600 font-medium">✅ مصغرة مخصصة</p>
                      )}
                    </div>
                  </div>

                  {/* Variant Local Error Alert */}
                  {state.error && (
                    <div className="p-2.5 bg-red-50 border border-red-300 rounded-lg text-xs text-red-700 space-y-0.5">
                      <p className="font-bold text-red-900">
                        ❌ فشل ({state.errorStep || "خطأ"}):
                      </p>
                      <p>{state.error}</p>
                    </div>
                  )}

                  {/* Variant Local Success Alert */}
                  {state.success && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 space-y-0.5">
                      <p className="font-bold text-emerald-900">
                        ✅ تم حفظ صورة {v.nom_variante_ar} بنجاح!
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        توفير: -{Math.round((1 - state.success.sizeAfter / state.success.sizeBefore) * 100)}% ({formatBytes(state.success.sizeAfter)})
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload Buttons for this Variant */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  {/* Gallery Image Input */}
                  <input
                    type="file"
                    id={galleryInputId}
                    accept="image/jpeg,image/png,image/webp"
                    disabled={state.loading}
                    onChange={(e) => handleVariantFileChange(e, v.variant_id, "gallery")}
                    className="hidden"
                  />
                  <label
                    htmlFor={galleryInputId}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer ${
                      state.loading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    }`}
                  >
                    {state.loading ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-gray-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>{state.loadingMessage || "جاري الرفع..."}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>{v.image_url ? "تغيير صورة هذا اللون" : "رفع صورة هذا اللون"}</span>
                      </>
                    )}
                  </label>

                  {/* Thumbnail Image Input (Optional) */}
                  <input
                    type="file"
                    id={thumbInputId}
                    accept="image/jpeg,image/png,image/webp"
                    disabled={state.loading}
                    onChange={(e) => handleVariantFileChange(e, v.variant_id, "thumb")}
                    className="hidden"
                  />
                  <label
                    htmlFor={thumbInputId}
                    className="w-full flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-[11px] font-semibold text-gray-600 bg-white hover:bg-gray-100 border border-gray-300 transition cursor-pointer"
                  >
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>رفع مصغرة دائرية (اختياري)</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
