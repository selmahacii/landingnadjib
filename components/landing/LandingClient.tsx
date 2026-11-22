"use client";

import React, { useState } from "react";
import type { Offer } from "@/lib/sheets/offers";
import type { Variant } from "@/lib/sheets/variants";
import type { DeliveryTariff } from "@/lib/sheets/delivery";
import { Gallery } from "./Gallery";
import { VariantPicker } from "./VariantPicker";
import { OfferPicker } from "./OfferPicker";
import { BenefitsSection } from "./BenefitsSection";

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

  const selectedOffer = offers.find((o) => o.offer_id === selectedOfferId) || offers[0];
  const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId) || variants[0];

  // Collect gallery images from variants or product
  const galleryImages = variants
    .filter((v) => v.image_url)
    .map((v) => v.image_url);

  // If selected variant has image, prioritize showing it
  const activeImage = selectedVariant?.image_url;
  const activeImageIndex = activeImage ? galleryImages.indexOf(activeImage) : 0;

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

        {/* Order Form Placeholder (wired in Task 9) */}
        <div id="order-form-section" className="bg-white rounded-2xl p-6 border-2 border-amber-500 shadow-md">
          <h3 className="text-lg font-bold text-neutral-900 mb-2">
            استمارة الطلب السريع (الدفع عند الاستلام)
          </h3>
          <p className="text-xs text-neutral-500">
            (سيتم تفعيل حقول الطلب وحساب التوصيل في الخطوة القادمة)
          </p>
        </div>

        {/* Benefits & Features Grid */}
        <BenefitsSection />
      </main>
    </div>
  );
};
