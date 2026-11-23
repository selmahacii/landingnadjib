import React, { useState, useEffect } from "react";
import wilayasData from "@/data/wilayas.json";
import type { DeliveryTariff } from "@/lib/sheets/delivery";

export interface DeliverySelection {
  wilaya_code: string;
  wilaya_nom: string;
  commune: string;
  mode_livraison: "Domicile" | "Stop Desk";
  prix_livraison: number;
}

interface WilayaCommuneSelectProps {
  tariffs: DeliveryTariff[];
  onChange: (sel: DeliverySelection) => void;
}

export const WilayaCommuneSelect: React.FC<WilayaCommuneSelectProps> = ({
  tariffs,
  onChange,
}) => {
  const [selectedWilayaCode, setSelectedWilayaCode] = useState<string>("");
  const [selectedCommune, setSelectedCommune] = useState<string>("");
  const [modeLivraison, setModeLivraison] = useState<"Domicile" | "Stop Desk">("Domicile");

  const currentWilaya = wilayasData.find((w) => w.code === selectedWilayaCode);
  const communes = currentWilaya?.communes || [];

  // Find tariff for selected wilaya
  const currentTariff = tariffs.find((t) => t.wilaya_code === selectedWilayaCode);
  const prixDomicile = currentTariff ? currentTariff.prix_domicile : 500;
  const prixStopdesk = currentTariff ? currentTariff.prix_stopdesk : 300;
  const currentPrice = modeLivraison === "Domicile" ? prixDomicile : prixStopdesk;

  // Handle Wilaya Change
  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedWilayaCode(code);
    setSelectedCommune(""); // Reset commune on wilaya switch (Review Focus point)

    if (code) {
      const wilayaObj = wilayasData.find((w) => w.code === code);
      const wilayaTariff = tariffs.find((t) => t.wilaya_code === code);
      const price = modeLivraison === "Domicile"
        ? (wilayaTariff ? wilayaTariff.prix_domicile : 500)
        : (wilayaTariff ? wilayaTariff.prix_stopdesk : 300);

      onChange({
        wilaya_code: code,
        wilaya_nom: wilayaObj?.name_ar || "",
        commune: "",
        mode_livraison: modeLivraison,
        prix_livraison: price,
      });
    } else {
      onChange({
        wilaya_code: "",
        wilaya_nom: "",
        commune: "",
        mode_livraison: modeLivraison,
        prix_livraison: 0,
      });
    }
  };

  // Handle Commune Change
  const handleCommuneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const com = e.target.value;
    setSelectedCommune(com);

    if (selectedWilayaCode) {
      onChange({
        wilaya_code: selectedWilayaCode,
        wilaya_nom: currentWilaya?.name_ar || "",
        commune: com,
        mode_livraison: modeLivraison,
        prix_livraison: currentPrice,
      });
    }
  };

  // Handle Delivery Mode Change
  const handleModeChange = (mode: "Domicile" | "Stop Desk") => {
    setModeLivraison(mode);

    if (selectedWilayaCode) {
      const price = mode === "Domicile" ? prixDomicile : prixStopdesk;
      onChange({
        wilaya_code: selectedWilayaCode,
        wilaya_nom: currentWilaya?.name_ar || "",
        commune: selectedCommune,
        mode_livraison: mode,
        prix_livraison: price,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Wilaya & Commune Selects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="wilaya-select" className="block text-sm font-semibold text-neutral-800 mb-1.5">
            الولاية *
          </label>
          <select
            id="wilaya-select"
            data-testid="wilaya-select"
            value={selectedWilayaCode}
            onChange={handleWilayaChange}
            className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          >
            <option value="">اختر الولاية...</option>
            {wilayasData.map((w) => (
              <option key={w.code} value={w.code}>
                {w.code} - {w.name_ar}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="commune-select" className="block text-sm font-semibold text-neutral-800 mb-1.5">
            البلدية *
          </label>
          <select
            id="commune-select"
            data-testid="commune-select"
            value={selectedCommune}
            onChange={handleCommuneChange}
            disabled={!selectedWilayaCode || communes.length === 0}
            className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
          >
            <option value="">
              {!selectedWilayaCode ? "اختر الولاية أولاً" : "اختر البلدية..."}
            </option>
            {communes.map((c, i) => (
              <option key={i} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode de livraison: Domicile vs Stop Desk */}
      {selectedWilayaCode && (
        <div className="pt-2">
          <label className="block text-sm font-semibold text-neutral-800 mb-2">
            طريقة التوصيل:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                modeLivraison === "Domicile"
                  ? "border-amber-600 bg-amber-50/40 text-neutral-900 font-medium"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode_livraison"
                  value="Domicile"
                  checked={modeLivraison === "Domicile"}
                  onChange={() => handleModeChange("Domicile")}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm">توصيل للبيت</span>
              </div>
              <span className="text-xs font-bold text-amber-700">{prixDomicile} دج</span>
            </label>

            <label
              className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                modeLivraison === "Stop Desk"
                  ? "border-amber-600 bg-amber-50/40 text-neutral-900 font-medium"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode_livraison"
                  value="Stop Desk"
                  checked={modeLivraison === "Stop Desk"}
                  onChange={() => handleModeChange("Stop Desk")}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm">استلام من المكتب (Stop Desk)</span>
              </div>
              <span className="text-xs font-bold text-amber-700">{prixStopdesk} دج</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
