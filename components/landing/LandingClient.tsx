"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Offer } from "@/lib/sheets/offers";
import type { Variant } from "@/lib/sheets/variants";
import type { DeliveryTariff } from "@/lib/sheets/delivery";
import type { SiteSettings } from "@/lib/sheets/settings";
import { Gallery } from "./Gallery";
import { VariantPicker } from "./VariantPicker";
import { OfferPicker } from "./OfferPicker";
import { WilayaCommuneSelect, type DeliverySelection } from "./WilayaCommuneSelect";
import { OrderForm } from "./OrderForm";
import { StickyCTA } from "./StickyCTA";
import { calculateTotal } from "@/lib/pricing";
import { trackPixelEvent } from "@/lib/meta/pixel";

const FALLBACK_SETTINGS: SiteSettings = {
  header_bg_color: "#171717",
  header_text_color: "#fbbf24",
  header_text_ar: "🚚 توصيل متوفر لـ 58 ولاية | 💵 الدفع عند الاستلام بعد معاينة السلعة",
  main_image_url: "",
};

interface LandingClientProps {
  offers: Offer[];
  variants: Variant[];
  tariffs: DeliveryTariff[];
  siteSettings?: SiteSettings;
}

export const LandingClient: React.FC<LandingClientProps> = ({
  offers,
  variants,
  tariffs,
  siteSettings = FALLBACK_SETTINGS,
}) => {
  const router = useRouter();

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

  // Fire ViewContent on mount (dual client Pixel + server CAPI dedup)
  useEffect(() => {
    const eventId = `vc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const value = selectedOffer?.prix_dzd || 2000;

    trackPixelEvent(
      "ViewContent",
      {
        content_name: "Porte feuille Classe",
        value,
        currency: "DZD",
      },
      eventId
    );

    fetch("/api/meta-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "ViewContent",
        event_id: eventId,
        event_source_url: window.location.href,
        custom_data: {
          content_name: "Porte feuille Classe",
          value,
          currency: "DZD",
        },
      }),
    }).catch(() => {});
  }, []);

  // Collect gallery images: main image first (if set), followed by variant images
  const variantImages = variants
    .filter((v) => v.image_url)
    .map((v) => v.image_url);

  const mainImg = siteSettings?.main_image_url || "";
  const galleryImages = [
    ...(mainImg ? [mainImg] : []),
    ...variantImages.filter((url) => url !== mainImg),
  ];

  const activeImage = selectedVariant?.image_url || mainImg || galleryImages[0] || "";
  const activeImageIndex = galleryImages.indexOf(activeImage);
  const safeGalleryIndex = activeImageIndex >= 0 ? activeImageIndex : 0;

  const handleSubmitSuccess = (order_id: string, summary: any) => {
    const params = new URLSearchParams({
      order_id,
      nom: summary.nom || "",
      offre: summary.offre || "",
      variante: summary.variante || "",
      quantite: String(summary.quantite || 1),
      wilaya: summary.wilaya || "",
      commune: summary.commune || "",
      total: String(summary.total || total),
    });
    router.push(`/thank-you?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Top Urgency / Reassurance Announcement Bar */}
      <header
        className="text-center py-2.5 px-4 text-xs sm:text-sm font-bold tracking-wide shadow-sm"
        style={{
          backgroundColor: siteSettings.header_bg_color,
          color: siteSettings.header_text_color,
        }}
      >
        <span>{siteSettings.header_text_ar}</span>
      </header>

      {/* Main Container: 0 padding on mobile for edge-to-edge photo with 0 border */}
      <main className="max-w-xl md:max-w-5xl mx-auto px-0 md:px-4 py-0 md:py-6">
        <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start space-y-4 md:space-y-0">
          {/* Column 1: Gallery */}
          <div className="w-full">
            <Gallery
              layout="grid"
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={(variantId) => {
                setSelectedVariantId(variantId);
              }}
              images={galleryImages.length > 0 ? galleryImages : activeImage ? [activeImage] : []}
              activeIndex={safeGalleryIndex}
              onSelectImage={(idx) => {
                const target = variants[idx];
                if (target) setSelectedVariantId(target.variant_id);
              }}
            />
          </div>

          {/* Column 2: Sticky column with Title, Price, Pickers and Order Form */}
          <div className="px-4 md:px-0 md:sticky md:top-6 space-y-6">
            {/* Product Title & Prominent Red Price */}
            <div className="text-right space-y-1.5 pt-2 md:pt-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-neutral-900 tracking-tight font-heading leading-tight">
                Porte feuille Classe
              </h1>

              <p className="text-sm sm:text-base md:text-lg font-bold text-neutral-700 font-cairo leading-snug">
                الأناقة والفخامة في التفاصيل ✨ محفظة جلدية رجالية راقية
              </p>

              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-3xl sm:text-4xl font-black text-red-600 font-cairo tracking-tight">
                  {selectedOffer?.prix_dzd?.toLocaleString()} دج
                </span>
                {selectedOffer?.prix_barre_dzd > selectedOffer?.prix_dzd && (
                  <span className="text-base sm:text-lg font-bold text-neutral-400 line-through font-cairo">
                    {selectedOffer?.prix_barre_dzd?.toLocaleString()} دج
                  </span>
                )}
              </div>
            </div>

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

            {/* Order Form Container with Wilaya/Commune, Pricing Breakdown & OrderForm */}
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
                  <span className="font-bold text-red-600">{selectedOffer?.prix_dzd} دج</span>
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

              {/* Actual Order Form */}
              <OrderForm
                offer={selectedOffer}
                variant={selectedVariant}
                delivery={deliverySelection}
                onSubmitSuccess={handleSubmitSuccess}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Sticky CTA for Mobile */}
      <StickyCTA targetId="order-form-section" price={total} />
    </div>
  );
};
