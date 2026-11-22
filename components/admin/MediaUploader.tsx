"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { Variant } from "@/lib/sheets/variants";

interface MediaUploaderProps {
  initialVariants: Variant[];
}

interface UploadedMediaResult {
  url: string;
  sizeBefore: number;
  sizeAfter: number;
  variantId?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ initialVariants }) => {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<"gallery" | "thumb">("gallery");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<UploadedMediaResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
      const objectUrl = URL.createObjectURL(selected);
      setPreviewUrl(objectUrl);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} ميغابايت`;
    }
    return `${Math.round(bytes / 1024)} كيلوبايت`;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("يرجى اختيار صورة أولاً");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      if (selectedVariantId) {
        formData.append("variant_id", selectedVariantId);
      }

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "فشل رفع الصورة");
      }

      setLastUpload({
        url: data.url,
        sizeBefore: data.sizeBefore,
        sizeAfter: data.sizeAfter,
        variantId: selectedVariantId || undefined,
      });

      // Update local variant state if assigned
      if (selectedVariantId) {
        setVariants((prev) =>
          prev.map((v) =>
            v.variant_id === selectedVariantId
              ? {
                  ...v,
                  [kind === "thumb" ? "thumb_url" : "image_url"]: data.url,
                }
              : v
          )
        );
      }

      setFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع أثناء الرفع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Box */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">رفع وتحسين الوسائط تلقائياً</h2>
        <p className="text-sm text-gray-500 mb-6">
          يتم تحويل كافة الصور تلقائياً إلى صيغة WebP عصرية مع ضغط احترافي وحذف بيانات EXIF لضمان سرعة فائقة.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* File Selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                اختر ملف الصورة (JPEG, PNG, WebP)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-amber-500 transition cursor-pointer">
                <input
                  type="file"
                  id="media-file-input"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="media-file-input" className="cursor-pointer block">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-2"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-medium text-amber-600 hover:text-amber-500">
                    اضغط لاختيار صورة من جهازك
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {file ? `الملف المختار: ${file.name} (${formatBytes(file.size)})` : "يدعم أحجام حتى 10 ميغابايت"}
                  </p>
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  نوع الاستخدام
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "gallery" | "thumb")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:outline-none"
                >
                  <option value="gallery">معرض رئيسي (أقصى عرض 1200px - جودة 80)</option>
                  <option value="thumb">صورة مصغرة (أقصى عرض 400px - جودة 80)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ربط بمتغير محدد (اختياري)
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">معرض عام للمنتج (دون تخصيص لمتغير)</option>
                  {variants.map((v) => (
                    <option key={v.variant_id} value={v.variant_id}>
                      {v.nom_variante_ar}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
              >
                {loading ? "جاري الضغط والرفع..." : "رفع وتحسين الصورة"}
              </button>
            </div>
          </div>
        </form>

        {/* Compression Result Banner */}
        {lastUpload && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold text-sm">تم ضغط ورفع الصورة بنجاح!</span>
                <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  توفير -{Math.round((1 - lastUpload.sizeAfter / lastUpload.sizeBefore) * 100)}%
                </span>
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                الحجم الأصلي: <span className="font-mono">{formatBytes(lastUpload.sizeBefore)}</span> ← الحجم بعد الضغط:{" "}
                <span className="font-mono font-bold">{formatBytes(lastUpload.sizeAfter)}</span>
              </p>
              <a
                href={lastUpload.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-600 hover:underline mt-1 inline-block"
              >
                رابط الصورة: {lastUpload.url} ↗
              </a>
            </div>
            {lastUpload.url && (
              <div className="relative w-16 h-16 rounded border overflow-hidden bg-white shrink-0">
                <img
                  src={lastUpload.url}
                  alt="Uploaded"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Variants Current Images List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">صور المتغيرات الحالية (الألوان)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {variants.map((v) => (
            <div
              key={v.variant_id}
              className="border border-gray-200 rounded-lg p-4 flex items-center gap-4 bg-gray-50"
            >
              <div className="relative w-16 h-16 bg-gray-200 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                {v.image_url ? (
                  <img
                    src={v.image_url}
                    alt={v.nom_variante_ar}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400 text-center px-1">لا توجد صورة</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-gray-900 truncate">{v.nom_variante_ar}</h4>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{v.variant_id}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVariantId(v.variant_id);
                    document.getElementById("media-file-input")?.click();
                  }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold mt-2 block"
                >
                  تغيير الصورة ↗
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
