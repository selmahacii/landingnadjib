import React from "react";
import type { Offer } from "@/lib/sheets/offers";

interface OfferPickerProps {
  offers: Offer[];
  selected: string;
  onSelect: (offer_id: string) => void;
}

export const OfferPicker: React.FC<OfferPickerProps> = ({ offers, selected, onSelect }) => {
  return (
    <div className="space-y-3 my-4">
      <label className="block text-sm font-bold text-neutral-800 mb-2">
        اختر العرض المناسب لك:
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {offers.map((offer) => {
          const isSelected = offer.offer_id === selected;

          return (
            <div
              key={offer.offer_id}
              onClick={() => onSelect(offer.offer_id)}
              className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-amber-600 bg-amber-50/50 shadow-md ring-1 ring-amber-600"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              {offer.badge_ar && (
                <span className="absolute -top-3 right-4 bg-amber-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  {offer.badge_ar}
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-amber-600 bg-amber-600" : "border-neutral-300"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900">{offer.titre_ar}</h4>
                    {offer.livraison_gratuite && (
                      <span className="text-xs text-emerald-600 font-medium">توصيل مجاني</span>
                    )}
                  </div>
                </div>

                <div className="text-left rtl:text-right">
                  <div className="text-lg font-extrabold text-amber-700">
                    {offer.prix_dzd} دج
                  </div>
                  {offer.prix_barre_dzd > offer.prix_dzd && (
                    <div className="text-xs text-neutral-400 line-through">
                      {offer.prix_barre_dzd} دج
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
