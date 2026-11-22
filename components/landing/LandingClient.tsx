"use client";

import React, { useState } from "react";
import type { Offer } from "@/lib/sheets/offers";
import type { Variant } from "@/lib/sheets/variants";
import type { DeliveryTariff } from "@/lib/sheets/delivery";
import { Gallery } from "./Gallery";
import { VariantPicker } from "./VariantPicker";
import { OfferPicker } from "./OfferPicker";
import { BenefitsSection } from "./BenefitsSection";
import { WilayaCommuneSelect, type DeliverySelection } from "./WilayaCommuneSelect";
import { calculateTotal } from "@/lib/pricing";

interface LandingClientProps {
  offers: Offer[];
  variants: Variant[];
  tariffs: DeliveryTariff[];
}

export const LandingClient: React.FC<LandingClientProps> = ({
  offers,
  variants,
  tariffs,
}) => {
  const defaultOffer = offers.find((o) => o.par_defaut) || offers[0];
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    defaultOffer ? defaultOffer.offer_id : ""
  );

  const defaultVariant = variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariant ? defaultVariant.variant_id : ""
  );

  const [deliverySelection, setDeliverySelection] = useState<DeliverySelection | null>(null);

  const selectedOffer = offers.find((o) => o.offer_id === selectedOfferId) || offers[0];
  const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId) || variants[0];

  const deliveryPrice = deliverySelection?.wilaya_code ? deliverySelection.prix_livraison : 0;
  const total = calculateTotal({ offer: selectedOffer, deliveryPrice });

  // Collect gallery images
  const galleryImages = variants
    .filter((v) => v.image_url)
    .map((v) => v.image_url);

  const activeImage = selectedVariant?.image_url;

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Top Urgency / Reassurance Announcement Bar */}
      <header className="bg-neutral-900 text-amber-400 text-center py-2.5 px-4 text-xs sm:text-sm font-bold tracking-wide shadow-sm">
        <span>🚚 توصيل متوفر لـ 58 ولاية | 💵 الدفع عند الاستلام بعد معاينة السلعة</span>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 py-5 space-y-6">
        {/* Product Title & Short Tagline */}
        <div className="text-center space-y-1">
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
            منتج أصلي 100%
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Porte feuille Classe
          </h1>
          <p className="text-sm text-neutral-600">
            محفظة جلدية راقية للرجال - تصميم عملي وسعة ممتازة للبطاقات والنقود
          </p>
        </div>

        {/* Gallery */}
        <Gallery
          images={activeImage ? [activeImage, ...galleryImages.filter((img) => img !== activeImage)] : galleryImages}
        />

        {/* Variant Picker */}
        <VariantPicker
          variants={variants}
          selected={selectedVariantId}
          onSelect={(id) => setSelectedVariantId(id)}
        />

        {/* Offer Picker */}
        <OfferPicker
          offers={offers}
          selected={selectedOfferId}
          onSelect={(id) => setSelectedOfferId(id)}
        />

        {/* Order Form Container with Wilaya/Commune and Live Total */}
        <div id="order-form-section" className="bg-white rounded-2xl p-6 border-2 border-amber-600/70 shadow-lg space-y-5">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-xl font-extrabold text-neutral-900">
              استمارة الطلب (الدفع عند الاستلام)
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              املأ معلوماتك وسنتصل بك لتأكيد طلبك قبل الشحن
            </p>
          </div>

          {/* Wilaya & Commune Selection */}
          <WilayaCommuneSelect
            tariffs={tariffs}
            onChange={(sel) => setDeliverySelection(sel)}
          />

          {/* Real-time Order Summary / Pricing Breakdown */}
          <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/80 space-y-2.5">
            <div className="flex justify-between items-center text-sm text-neutral-700">
              <span>سعر العرض ({selectedOffer?.titre_ar}):</span>
              <span className="font-bold text-neutral-900">{selectedOffer?.prix_dzd} دج</span>
            </div>

            <div className="flex justify-between items-center text-sm text-neutral-700">
              <span>سعر التوصيل:</span>
              <span className="font-bold text-neutral-900">
                {selectedOffer?.livraison_gratuite ? (
                  <span className="text-emerald-600 font-extrabold">0 دج - مجاني</span>
                ) : deliverySelection?.wilaya_code ? (
                  `${deliveryPrice} دج`
                ) : (
                  <span className="text-neutral-400 font-normal">اختر الولاية لحساب التوصيل</span>
                )}
              </span>
            </div>

            <div className="border-t border-amber-200/60 pt-2.5 flex justify-between items-center">
              <span className="font-extrabold text-neutral-900 text-base">المجموع الكلي:</span>
              <span className="text-xl font-black text-amber-700">
                {total} دج
              </span>
            </div>
          </div>
        </div>

        {/* Benefits & Features Grid */}
        <BenefitsSection />
      </main>
    </div>
  );
};
