"use client";

import React, { useState } from "react";
import type { DeliveryTariff } from "@/lib/sheets/delivery";

interface DeliveryTableProps {
  initialTariffs: DeliveryTariff[];
}

export const DeliveryTable: React.FC<DeliveryTableProps> = ({ initialTariffs }) => {
  const [tariffs, setTariffs] = useState<DeliveryTariff[]>(initialTariffs);
  const [search, setSearch] = useState("");
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ [code: string]: { type: "success" | "error"; text: string } }>({});

  const filteredTariffs = tariffs.filter(
    (t) =>
      t.wilaya_code.includes(search) ||
      t.wilaya_ar.toLowerCase().includes(search.toLowerCase())
  );

  const handleFieldChange = (
    code: string,
    field: "prix_domicile" | "prix_stopdesk" | "actif",
    value: number | boolean
  ) => {
    setTariffs((prev) =>
      prev.map((t) => (t.wilaya_code === code ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = async (tariff: DeliveryTariff) => {
    setSavingCode(tariff.wilaya_code);
    setStatusMessage((prev) => ({ ...prev, [tariff.wilaya_code]: undefined as any }));

    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tariff),
      });

      if (!res.ok) {
        throw new Error("فشل الحفظ");
      }

      setStatusMessage((prev) => ({
        ...prev,
        [tariff.wilaya_code]: { type: "success", text: "تم الحفظ ✓" },
      }));

      setTimeout(() => {
        setStatusMessage((prev) => ({ ...prev, [tariff.wilaya_code]: undefined as any }));
      }, 3000);
    } catch {
      setStatusMessage((prev) => ({
        ...prev,
        [tariff.wilaya_code]: { type: "error", text: "خطأ في الحفظ" },
      }));
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">أسعار وتكاليف التوصيل</h2>
          <p className="text-sm text-gray-500 mt-1">
            إدارة تسعير التوصيل للمنزل والمكتب لـ 58 ولاية جزائرية
          </p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرمز..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-right">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">الرمز</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">الولاية</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                توصيل للمنزل (دج)
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                توصيل للمكتب / Stopdesk (دج)
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">الحالة</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">
                إجراء
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredTariffs.map((t) => {
              const isSaving = savingCode === t.wilaya_code;
              const status = statusMessage[t.wilaya_code];

              return (
                <tr key={t.wilaya_code} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-gray-600">{t.wilaya_code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.wilaya_ar}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={t.prix_domicile}
                      onChange={(e) =>
                        handleFieldChange(
                          t.wilaya_code,
                          "prix_domicile",
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        )
                      }
                      className="w-28 px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={t.prix_stopdesk}
                      onChange={(e) =>
                        handleFieldChange(
                          t.wilaya_code,
                          "prix_stopdesk",
                          Math.max(0, parseInt(e.target.value, 10) || 0)
                        )
                      }
                      className="w-28 px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.actif}
                        onChange={(e) =>
                          handleFieldChange(t.wilaya_code, "actif", e.target.checked)
                        }
                        className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                      <span className={`text-xs ${t.actif ? "text-green-600" : "text-gray-400"}`}>
                        {t.actif ? "مفعّل" : "معطّل"}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSave(t)}
                        disabled={isSaving}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded shadow transition disabled:opacity-50 cursor-pointer"
                      >
                        {isSaving ? "جاري الحفظ..." : "حفظ"}
                      </button>
                      {status && (
                        <span
                          className={`text-xs font-medium ${
                            status.type === "success" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {status.text}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
