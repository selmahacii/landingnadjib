import React from "react";
import Image from "next/image";
import type { Variant } from "@/lib/sheets/variants";

interface VariantPickerProps {
  variants: Variant[];
  selected: string;
  onSelect: (variant_id: string) => void;
}

const colorSwatchMap: Record<string, string> = {
  var_noir: "#18181b",
  var_beige: "#d4b996",
  var_vert: "#1e3a2f",
  var_marron: "#4a2e18",
  var_rouge: "#7f1d1d",
};

export const VariantPicker: React.FC<VariantPickerProps> = ({ variants, selected, onSelect }) => {
  return (
    <div className="space-y-3 my-4">
      <label className="block text-sm font-bold text-neutral-800">
        اختر اللون المفضل:
      </label>
      <div className="flex flex-wrap gap-2.5">
        {variants.map((v) => {
          const isSelected = v.variant_id === selected;
          const swatchColor = colorSwatchMap[v.variant_id] || "#737373";

          return (
            <button
              key={v.variant_id}
              type="button"
              onClick={() => onSelect(v.variant_id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-amber-600 bg-amber-50 shadow-sm ring-1 ring-amber-600 font-bold text-neutral-900"
                  : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-700"
              }`}
            >
              {v.thumb_url ? (
                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-neutral-300">
                  <Image
                    src={v.thumb_url}
                    alt={v.nom_variante_ar}
                    width={24}
                    height={24}
                    className="object-cover"
                  />
                </div>
              ) : (
                <span
                  className="w-4 h-4 rounded-full border border-black/10 inline-block shrink-0 shadow-inner"
                  style={{ backgroundColor: swatchColor }}
                />
              )}
              <span className="text-sm">{v.nom_variante_ar}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
