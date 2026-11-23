"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Offer } from "@/lib/sheets/offers";
import type { Variant } from "@/lib/sheets/variants";
import type { DeliveryTariff } from "@/lib/sheets/delivery";
import type { SiteSettings } from "@/lib/sheets/settings";
import { Gallery } from "./Gallery";
import { OfferPicker } from "./OfferPicker";
import { type DeliverySelection } from "./WilayaCommuneSelect";
import { OrderForm, sortVariantsByColorOrder } from "./OrderForm";
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
  const sortedVariants = sortVariantsByColorOrder(variants);

  const defaultOffer = offers.find((o) => o.par_defaut) || offers[0];
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    defaultOffer ? defaultOffer.offer_id : ""
  );

  const selectedOffer = offers.find((o) => o.offer_id === selectedOfferId) || offers[0];
  const offerQty = Math.max(1, selectedOffer?.quantite || 1);

  // Manage multi-variant selections based on offer quantity
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(() => {
    const list: string[] = [];
    for (let i = 0; i < offerQty; i++) {
      list.push(sortedVariants[i]?.variant_id || sortedVariants[0]?.variant_id || "");
    }
    return list;
  });

  // Track the most recently clicked variant to sync gallery image
  const [galleryFocusVariantId, setGalleryFocusVariantId] = useState<string>(
    selectedVariantIds[0] || sortedVariants[0]?.variant_id || ""
  );

  const [deliverySelection, setDeliverySelection] = useState<DeliverySelection | null>(null);

  // When offer changes: if switching from 1 to 2, add second variant; if switching to 1, slice
  const handleSelectOffer = (offerId: string) => {
    setSelectedOfferId(offerId);
    const targetOffer = offers.find((o) => o.offer_id === offerId);
    const targetQty = Math.max(1, targetOffer?.quantite || 1);

    setSelectedVariantIds((prev) => {
      const next = [...prev];
      while (next.length < targetQty) {
        const nextIdx = next.length;
        const fallback =
          sortedVariants[nextIdx]?.variant_id ||
          sortedVariants[0]?.variant_id ||
          "";
        next.push(fallback);
      }
      return next.slice(0, targetQty);
    });
  };

  const handleSelectVariantAt = (index: number, variantId: string) => {
    setSelectedVariantIds((prev) => {
      const next = [...prev];
      next[index] = variantId;
      return next;
    });
    setGalleryFocusVariantId(variantId);
  };

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

  const focusVariant =
    variants.find((v) => v.variant_id === galleryFocusVariantId) ||
    variants.find((v) => v.variant_id === selectedVariantIds[0]) ||
    variants[0];

  const activeImage = focusVariant?.image_url || mainImg || galleryImages[0] || "";
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
              selectedVariantId={galleryFocusVariantId}
              onSelectVariant={(variantId) => {
                handleSelectVariantAt(0, variantId);
              }}
              images={galleryImages.length > 0 ? galleryImages : activeImage ? [activeImage] : []}
              activeIndex={safeGalleryIndex}
              onSelectImage={(idx) => {
                const target = variants[idx];
                if (target) {
                  handleSelectVariantAt(0, target.variant_id);
                }
              }}
            />
          </div>

          {/* Column 2: Sticky column with Title, Price, Offer Picker and Chicoutfit-style Order Form */}
          <div className="px-4 md:px-0 md:sticky md:top-6 space-y-5">
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

            {/* Offer Picker */}
            <OfferPicker
              offers={offers}
              selected={selectedOfferId}
              onSelect={handleSelectOffer}
            />

            {/* Order Form Card Container (Paiement à la livraison) */}
            <div
              id="order-form-section"
              className="bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200/90 shadow-sm"
            >
              <OrderForm
                offer={selectedOffer}
                variants={variants}
                selectedVariantIds={selectedVariantIds}
                onSelectVariantAt={handleSelectVariantAt}
                delivery={deliverySelection}
                tariffs={tariffs}
                onDeliveryChange={setDeliverySelection}
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
