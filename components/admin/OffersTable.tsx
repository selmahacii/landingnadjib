"use client";

import React, { useState } from "react";
import type { Offer } from "@/lib/sheets/offers";

interface OffersTableProps {
  initialOffers: Offer[];
}

export const OffersTable: React.FC<OffersTableProps> = ({ initialOffers }) => {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ [id: string]: { type: "success" | "error"; text: string } }>({});

  const handleFieldChange = (
    id: string,
    field: keyof Offer,
    value: string | number | boolean
  ) => {
    setOffers((prev) =>
      prev.map((o) => {
        if (o.offer_id !== id) return o;
        return { ...o, [field]: value };
      })
    );
  };

  const handleSave = async (offer: Offer) => {
    setSavingId(offer.offer_id);
    setStatusMessage((prev) => ({ ...prev, [offer.offer_id]: undefined as any }));

    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offer),
      });

      if (!res.ok) {
        throw new Error("فشل الحفظ");
      }

      setStatusMessage((prev) => ({
        ...prev,
        [offer.offer_id]: { type: "success", text: "تم الحفظ ✓" },
      }));

      setTimeout(() => {
        setStatusMessage((prev) => ({ ...prev, [offer.offer_id]: undefined as any }));
      }, 3000);
    } catch {
      setStatusMessage((prev) => ({
        ...prev,
        [offer.offer_id]: { type: "error", text: "خطأ في الحفظ" },
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handleAddNewOffer = () => {
    const nextNum = offers.length + 1;
    const newOffer: Offer = {
      offer_id: `pack_${nextNum}`,
      titre_ar: `عرض ${nextNum} قطع`,
      quantite: nextNum,
      prix_dzd: 2000 * nextNum,
      prix_barre_dzd: 2500 * nextNum,
      badge_ar: "",
      livraison_gratuite: false,
      par_defaut: false,
      ordre: nextNum,
      actif: true,
    };
    setOffers((prev) => [...prev, newOffer]);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">إدارة العروض والباقات</h2>
          <p className="text-sm text-gray-500 mt-1">
            تعديل، تفعيل، أو إضافة عروض جديدة للمنتج تظهر مباشرة في صفحة الهبوط
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNewOffer}
          className="bg-green-600 hover:bg-green-700 text-white font-medium text-sm px-4 py-2 rounded-lg shadow transition cursor-pointer"
        >
          + إضافة عرض جديد
        </button>
      </div>

      <div className="space-y-6">
        {offers.map((offer) => {
          const isSaving = savingId === offer.offer_id;
          const status = statusMessage[offer.offer_id];

          return (
            <div
              key={offer.offer_id}
              className={`border rounded-lg p-5 transition ${
                offer.actif ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-75"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    معرّف العرض (ID)
                  </label>
                  <input
                    type="text"
                    value={offer.offer_id}
                    onChange={(e) => handleFieldChange(offer.offer_id, "offer_id", e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    عنوان العرض (بالعربية)
                  </label>
                  <input
                    type="text"
                    value={offer.titre_ar}
                    onChange={(e) => handleFieldChange(offer.offer_id, "titre_ar", e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">الكمية</label>
                  <input
                    type="number"
                    min="1"
                    value={offer.quantite}
                    onChange={(e) =>
                      handleFieldChange(
                        offer.offer_id,
                        "quantite",
                        Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    }
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    الترتيب (الأولوية)
                  </label>
                  <input
                    type="number"
                    value={offer.ordre}
                    onChange={(e) =>
                      handleFieldChange(
                        offer.offer_id,
                        "ordre",
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    السعر الفعلي (دج)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={offer.prix_dzd}
                    onChange={(e) =>
                      handleFieldChange(
                        offer.offer_id,
                        "prix_dzd",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    السعر المشطوب (دج)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={offer.prix_barre_dzd}
                    onChange={(e) =>
                      handleFieldChange(
                        offer.offer_id,
                        "prix_barre_dzd",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-500 line-through"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    شارة ترويجية (Badge)
                  </label>
                  <input
                    type="text"
                    value={offer.badge_ar}
                    placeholder="مثال: الأكثر طلباً - تخفيض 20%"
                    onChange={(e) => handleFieldChange(offer.offer_id, "badge_ar", e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offer.livraison_gratuite}
                      onChange={(e) =>
                        handleFieldChange(offer.offer_id, "livraison_gratuite", e.target.checked)
                      }
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-gray-700">توصيل مجاني</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offer.par_defaut}
                      onChange={(e) =>
                        handleFieldChange(offer.offer_id, "par_defaut", e.target.checked)
                      }
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-xs font-medium text-gray-700">محدد افتراضياً</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={offer.actif}
                      onChange={(e) =>
                        handleFieldChange(offer.offer_id, "actif", e.target.checked)
                      }
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className={`text-xs font-medium ${offer.actif ? "text-green-600" : "text-gray-400"}`}>
                      {offer.actif ? "مفعّل" : "معطّل"}
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  {status && (
                    <span
                      className={`text-xs font-medium ${
                        status.type === "success" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {status.text}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSave(offer)}
                    disabled={isSaving}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2 rounded shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
