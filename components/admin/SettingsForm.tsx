"use client";

import React, { useState } from "react";
import type { SiteSettings } from "@/lib/sheets/settings";

interface SettingsFormProps {
  initialSettings: SiteSettings;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ initialSettings }) => {
  const [headerBgColor, setHeaderBgColor] = useState(initialSettings.header_bg_color || "#171717");
  const [headerTextColor, setHeaderTextColor] = useState(initialSettings.header_text_color || "#fbbf24");
  const [headerTextAr, setHeaderTextAr] = useState(
    initialSettings.header_text_ar || "🚚 توصيل متوفر لـ 58 ولاية | 💵 الدفع عند الاستلام بعد معاينة السلعة"
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header_bg_color: headerBgColor,
          header_text_color: headerTextColor,
          header_text_ar: headerTextAr,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "فشل حفظ الإعدادات");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          إعدادات الشريط العلوي ومظهر المتجر
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          يمكنك تخصيص لون خلفية الشريط العلوي، لون الخط، والنص المعروض للزبائن. التعديلات تنعكس فوراً على المتجر.
        </p>

        {/* Live Preview */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            معاينة مباشرة للشريط العلوي (Aperçu en direct) :
          </label>
          <div
            className="text-center py-3 px-4 text-xs sm:text-sm font-bold tracking-wide shadow-sm rounded-xl transition-all duration-200 border border-black/10"
            style={{
              backgroundColor: headerBgColor,
              color: headerTextColor,
            }}
          >
            <span>{headerTextAr || "نص الإعلان..."}</span>
          </div>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2">
            <span>✓</span>
            <span>تم حفظ الإعدادات بنجاح وتحديث المتجر فوراً!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Header Background Color */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              لون خلفية الشريط (Header Background Color)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={headerBgColor}
                onChange={(e) => setHeaderBgColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300 p-1 bg-white"
              />
              <input
                type="text"
                value={headerBgColor}
                onChange={(e) => setHeaderBgColor(e.target.value)}
                dir="ltr"
                placeholder="#171717"
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "أسود", color: "#171717" },
                  { label: "كحلي", color: "#0f172a" },
                  { label: "أخضر", color: "#15803d" },
                  { label: "عنابي", color: "#881337" },
                  { label: "بني", color: "#78350f" },
                ].map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => setHeaderBgColor(preset.color)}
                    className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Header Text Color */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              لون النص في الشريط (Header Text Color)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={headerTextColor}
                onChange={(e) => setHeaderTextColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300 p-1 bg-white"
              />
              <input
                type="text"
                value={headerTextColor}
                onChange={(e) => setHeaderTextColor(e.target.value)}
                dir="ltr"
                placeholder="#fbbf24"
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "أصفر ذهبي", color: "#fbbf24" },
                  { label: "أبيض", color: "#ffffff" },
                  { label: "أسود", color: "#171717" },
                ].map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => setHeaderTextColor(preset.color)}
                    className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Header Announcement Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              نص الإعلان في الشريط العلوي (Texte du bandeau)
            </label>
            <input
              type="text"
              value={headerTextAr}
              onChange={(e) => setHeaderTextAr(e.target.value)}
              placeholder="مثال: 🚚 توصيل متوفر لـ 58 ولاية | 💵 الدفع عند الاستلام بعد معاينة السلعة"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm hover:shadow transition disabled:opacity-60 flex items-center gap-2 text-sm"
            >
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
