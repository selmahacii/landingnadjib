"use client";

import React, { useState, useEffect, useRef } from "react";
import wilayasData from "@/data/wilayas.json";
import { normalizePhone } from "@/lib/phone";
import { safeStorage } from "@/lib/safeStorage";
import { getOrCreateSessionId, captureAttribution } from "@/lib/session";
import { calculateTotal } from "@/lib/pricing";
import { trackPixelEvent } from "@/lib/meta/pixel";
import type { Offer } from "@/lib/sheets/offers";
import type { Variant } from "@/lib/sheets/variants";
import type { DeliveryTariff } from "@/lib/sheets/delivery";
import type { DeliverySelection } from "./WilayaCommuneSelect";

export interface ColorDef {
  hex: string;
  label_en: string;
  label_fr: string;
  label_ar: string;
}

export const COLOR_CONFIG: Record<string, ColorDef> = {
  vert: { hex: "#15803d", label_en: "Green", label_fr: "Vert", label_ar: "أخضر" },
  var_vert: { hex: "#15803d", label_en: "Green", label_fr: "Vert", label_ar: "أخضر" },
  beige: { hex: "#e4cca6", label_en: "Beige", label_fr: "Beige", label_ar: "بيج" },
  var_beige: { hex: "#e4cca6", label_en: "Beige", label_fr: "Beige", label_ar: "بيج" },
  noir: { hex: "#18181b", label_en: "Black", label_fr: "Noir", label_ar: "أسود" },
  var_noir: { hex: "#18181b", label_en: "Black", label_fr: "Noir", label_ar: "أسود" },
  rouge: { hex: "#dc2626", label_en: "Red", label_fr: "Rouge", label_ar: "أحمر" },
  var_rouge: { hex: "#dc2626", label_en: "Red", label_fr: "Rouge", label_ar: "أحمر" },
  marron: { hex: "#b46f36", label_en: "Brown", label_fr: "Marron", label_ar: "بني" },
  var_marron: { hex: "#b46f36", label_en: "Brown", label_fr: "Marron", label_ar: "بني" },
};

const COLOR_ORDER = ["vert", "beige", "noir", "rouge", "marron"];

export function sortVariantsByColorOrder(variants: Variant[]): Variant[] {
  return [...variants].sort((a, b) => {
    const kA = a.variant_id.toLowerCase().replace(/^var_/, "");
    const kB = b.variant_id.toLowerCase().replace(/^var_/, "");
    const pA = COLOR_ORDER.indexOf(kA);
    const pB = COLOR_ORDER.indexOf(kB);
    if (pA !== -1 && pB !== -1) return pA - pB;
    if (pA !== -1) return -1;
    if (pB !== -1) return 1;
    return a.ordre - b.ordre;
  });
}

function formatPriceDA(amount: number): string {
  return (
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " DA"
  );
}

export interface OrderFormProps {
  offer: Offer;
  variant?: Variant;
  variants?: Variant[];
  selectedVariantIds?: string[];
  onSelectVariantAt?: (index: number, variantId: string) => void;
  delivery?: DeliverySelection | null;
  tariffs?: DeliveryTariff[];
  onDeliveryChange?: (delivery: DeliverySelection | null) => void;
  onSubmitSuccess: (order_id: string, summary: any) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  offer,
  variant,
  variants = [],
  selectedVariantIds,
  onSelectVariantAt,
  delivery,
  tariffs = [],
  onDeliveryChange,
  onSubmitSuccess,
}) => {
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [selectedWilayaCode, setSelectedWilayaCode] = useState<string>(
    delivery?.wilaya_code || ""
  );
  const [selectedCommune, setSelectedCommune] = useState<string>(
    delivery?.commune || ""
  );
  const [honeypot, setHoneypot] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    delivery?: string;
    global?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const lastFieldRef = useRef<string>("");
  const abandonedSentRef = useRef<boolean>(false);
  const orderSubmittedRef = useRef<boolean>(false);

  // Sync external delivery prop if changed
  useEffect(() => {
    if (delivery?.wilaya_code && delivery.wilaya_code !== selectedWilayaCode) {
      setSelectedWilayaCode(delivery.wilaya_code);
      setSelectedCommune(delivery.commune || "");
    }
  }, [delivery]);

  // Available variants list
  const availableVariants =
    variants.length > 0 ? variants : variant ? [variant] : [];
  const sortedVariants = sortVariantsByColorOrder(availableVariants);

  // Determine current wilaya & communes
  const currentWilaya = wilayasData.find((w) => w.code === selectedWilayaCode);
  const communes = (currentWilaya?.communes || []).filter(Boolean);

  // Delivery pricing logic
  const isFreeDelivery = Boolean(offer.livraison_gratuite);
  const currentTariff = tariffs.find((t) => t.wilaya_code === selectedWilayaCode);
  const effectiveDeliveryPrice = isFreeDelivery
    ? 0
    : delivery?.prix_livraison !== undefined && delivery?.wilaya_code === selectedWilayaCode
    ? delivery.prix_livraison
    : currentTariff
    ? currentTariff.prix_domicile
    : selectedWilayaCode
    ? 500
    : 0;

  const hasWilayaSelected = Boolean(selectedWilayaCode || delivery?.wilaya_code);
  const total = calculateTotal({
    offer,
    deliveryPrice: hasWilayaSelected ? effectiveDeliveryPrice : 0,
  });

  const quantity = Math.max(1, offer.quantite || 1);

  // Build the formatted variant name
  const formattedVariante = (() => {
    if (selectedVariantIds && selectedVariantIds.length > 0) {
      return selectedVariantIds
        .slice(0, quantity)
        .map((vid) => {
          const v = availableVariants.find((av) => av.variant_id === vid);
          return v?.nom_variante_ar || vid;
        })
        .join(" + ");
    }
    return variant?.nom_variante_ar || "افتراضي";
  })();

  const handleFirstFocus = () => {
    const sessionId = getOrCreateSessionId();
    if (!safeStorage.getItem(`cod_ic_${sessionId}`)) {
      safeStorage.setItem(`cod_ic_${sessionId}`, "1");
      const eventId = `ic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      trackPixelEvent(
        "InitiateCheckout",
        { value: offer.prix_dzd, currency: "DZD" },
        eventId
      );
      fetch("/api/meta-capi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "InitiateCheckout",
          event_id: eventId,
          event_source_url:
            typeof window !== "undefined" ? window.location.href : "",
          custom_data: { value: offer.prix_dzd, currency: "DZD" },
        }),
      }).catch(() => {});
    }
  };

  // Abandoned cart beacon
  const sendAbandonedBeacon = (phoneNorm: string) => {
    if (abandonedSentRef.current || orderSubmittedRef.current) return;
    const sessionId = getOrCreateSessionId();
    if (safeStorage.getItem(`cod_abn_${sessionId}`)) return;

    abandonedSentRef.current = true;
    safeStorage.setItem(`cod_abn_${sessionId}`, "1");

    const attribution = captureAttribution();
    const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000);

    const payload = JSON.stringify({
      session_id: sessionId,
      telephone_normalise: phoneNorm,
      nom_complet: nomComplet,
      wilaya_code: selectedWilayaCode,
      wilaya_nom: currentWilaya?.name_ar || delivery?.wilaya_nom || "",
      commune: selectedCommune || delivery?.commune || "",
      adresse_livraison: selectedCommune,
      mode_livraison: "Domicile",
      offre_choisie: offer?.titre_ar || "",
      variante_choisie: formattedVariante,
      quantite: quantity,
      prix_offre_dzd: offer?.prix_dzd || 0,
      prix_livraison_dzd: hasWilayaSelected ? effectiveDeliveryPrice : 0,
      total_dzd: total,
      device_navigateur:
        typeof navigator !== "undefined" ? navigator.userAgent : "",
      temps_sur_page_sec: elapsedSec,
      dernier_champ_rempli: lastFieldRef.current,
      ...attribution,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/abandoned-cart", blob);
    } else {
      fetch("/api/abandoned-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const phoneNorm = normalizePhone(telephone);
    if (!phoneNorm) return;

    const timer = setTimeout(() => {
      sendAbandonedBeacon(phoneNorm);
    }, 45000);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        sendAbandonedBeacon(phoneNorm);
      }
    };

    const handlePageHide = () => {
      sendAbandonedBeacon(phoneNorm);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [telephone, nomComplet, selectedWilayaCode, selectedCommune, offer, formattedVariante]);

  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedWilayaCode(code);
    setSelectedCommune("");
    lastFieldRef.current = "wilaya";
    if (errors.delivery) setErrors((prev) => ({ ...prev, delivery: undefined }));

    if (code) {
      const wilayaObj = wilayasData.find((w) => w.code === code);
      const tariff = tariffs.find((t) => t.wilaya_code === code);
      const price = offer.livraison_gratuite
        ? 0
        : tariff
        ? tariff.prix_domicile
        : 500;

      onDeliveryChange?.({
        wilaya_code: code,
        wilaya_nom: wilayaObj?.name_ar || "",
        commune: "",
        mode_livraison: "Domicile",
        prix_livraison: price,
      });
    } else {
      onDeliveryChange?.(null);
    }
  };

  const handleCommuneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const com = e.target.value;
    setSelectedCommune(com);
    lastFieldRef.current = "commune";

    if (selectedWilayaCode) {
      const wilayaObj = wilayasData.find((w) => w.code === selectedWilayaCode);
      const tariff = tariffs.find((t) => t.wilaya_code === selectedWilayaCode);
      const price = offer.livraison_gratuite
        ? 0
        : tariff
        ? tariff.prix_domicile
        : 500;

      onDeliveryChange?.({
        wilaya_code: selectedWilayaCode,
        wilaya_nom: wilayaObj?.name_ar || "",
        commune: com,
        mode_livraison: "Domicile",
        prix_livraison: price,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot) return;
    if (isSubmitting) return;

    const newErrors: typeof errors = {};
    if (!nomComplet.trim()) {
      newErrors.name = "يرجى إدخال الاسم واللقب";
    }

    const normalizedTel = normalizePhone(telephone);
    if (!normalizedTel) {
      newErrors.phone = "يرجى إدخال رقم هاتف صحيح (05/06/07)";
    }

    const activeWilayaCode = selectedWilayaCode || delivery?.wilaya_code;
    if (!activeWilayaCode) {
      newErrors.delivery = "يرجى اختيار الولاية";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const sessionId = getOrCreateSessionId();
      const attribution = captureAttribution();
      const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000);
      const wilayaNom = currentWilaya?.name_ar || delivery?.wilaya_nom || "";

      const orderPayload = {
        session_id: sessionId,
        nom_complet: nomComplet.trim(),
        telephone_normalise: normalizedTel!,
        wilaya_code: activeWilayaCode!,
        wilaya_nom: wilayaNom,
        commune: selectedCommune || delivery?.commune || "",
        adresse_livraison: selectedCommune || delivery?.commune || "",
        mode_livraison: "Domicile",
        offre_choisie: offer.titre_ar,
        variante_choisie: formattedVariante,
        quantite: quantity,
        prix_offre_dzd: offer.prix_dzd,
        prix_livraison_dzd: effectiveDeliveryPrice,
        total_dzd: total,
        device_navigateur:
          typeof navigator !== "undefined" ? navigator.userAgent : "",
        temps_sur_page_sec: elapsedSec,
        dernier_champ_rempli: lastFieldRef.current,
        notes: "",
        ...attribution,
      };

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "حدث خطأ أثناء تسجيل طلبكم. يرجى المحاولة مرة أخرى."
        );
      }

      orderSubmittedRef.current = true;

      if (data.event_id) {
        trackPixelEvent(
          "Purchase",
          { value: total, currency: "DZD" },
          data.event_id
        );
      }

      onSubmitSuccess(data.order_id, {
        order_id: data.order_id,
        nom: nomComplet,
        offre: offer.titre_ar,
        variante: formattedVariante,
        quantite: quantity,
        wilaya: wilayaNom,
        commune: selectedCommune || delivery?.commune || "",
        total: total,
      });
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        global:
          err.message ||
          "تعذر إرسال الطلب. يرجى التحقق من الاتصال وإعادة المحاولة.",
      }));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} dir="ltr" className="space-y-4">
      {/* Honeypot field for anti-bot protection */}
      <div style={{ display: "none" }} aria-hidden="true">
        <label htmlFor="_hp_website">Website</label>
        <input
          id="_hp_website"
          data-testid="hp-field"
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Title & Subtitle: Exact chicoutfit.net style */}
      <div className="text-center pt-1 pb-1">
        <h3 className="text-2xl sm:text-[26px] font-black text-[#1e5aa8] tracking-tight font-heading">
          Paiement à la livraison
        </h3>
        <p className="text-sm font-bold text-neutral-800 font-cairo mt-1">
          المرجو إدخال معلوماتك الخاصة بك
        </p>
      </div>

      {/* Global submission error */}
      {errors.global && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium text-right font-cairo" dir="rtl">
          {errors.global}
        </div>
      )}

      {/* Dynamic Color Selection: 1 item -> "Couleur Green", 2 items -> "Couleur 1: Green" & "Couleur 2: Black" */}
      {sortedVariants.length > 0 && (
        <div className="space-y-3.5 pt-1">
          {Array.from({ length: quantity }).map((_, itemIdx) => {
            const currentVarId =
              selectedVariantIds?.[itemIdx] ||
              (itemIdx === 0
                ? variant?.variant_id
                : sortedVariants[itemIdx]?.variant_id) ||
              sortedVariants[0]?.variant_id ||
              "";

            const currentVar =
              availableVariants.find((v) => v.variant_id === currentVarId) ||
              availableVariants[0];

            const colorKey =
              currentVar?.variant_id?.toLowerCase()?.replace(/^var_/, "") || "";
            const activeColorCfg = COLOR_CONFIG[colorKey] || {
              hex: "#737373",
              label_en: currentVar?.nom_variante_ar || "Default",
              label_fr: currentVar?.nom_variante_ar || "Défaut",
              label_ar: currentVar?.nom_variante_ar || "",
            };

            const labelTitle =
              quantity > 1
                ? `Couleur ${itemIdx + 1}`
                : `Couleur`;

            return (
              <div key={itemIdx} className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                  <span>{labelTitle}</span>
                  <span className="font-normal text-neutral-700">
                    {activeColorCfg.label_en}
                  </span>
                </div>

                {/* Swatches row in exact order from left to right: Green, Beige, Black, Red, Brown */}
                <div className="flex items-center gap-3">
                  {sortedVariants.map((v) => {
                    const isSelected = v.variant_id === currentVarId;
                    const vKey = v.variant_id.toLowerCase().replace(/^var_/, "");
                    const vCfg = COLOR_CONFIG[vKey] || {
                      hex: "#737373",
                      label_en: v.nom_variante_ar,
                    };

                    return (
                      <button
                        key={v.variant_id}
                        type="button"
                        onClick={() => {
                          onSelectVariantAt?.(itemIdx, v.variant_id);
                        }}
                        title={`${vCfg.label_en} / ${v.nom_variante_ar}`}
                        aria-label={`Choisir couleur ${vCfg.label_en}`}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-150 transform hover:scale-105 active:scale-95 cursor-pointer relative ${
                          isSelected
                            ? "ring-2 ring-neutral-900 ring-offset-2 scale-105 shadow-sm"
                            : "hover:opacity-90 border border-black/10 shadow-sm"
                        }`}
                        style={{ backgroundColor: vCfg.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Field 1: Prénom * */}
      <div>
        <label
          htmlFor="name-input"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Prénom <span className="text-red-500">*</span>
        </label>
        <div
          className={`flex items-stretch rounded-lg border bg-white overflow-hidden transition-all ${
            errors.name
              ? "border-red-400 ring-1 ring-red-400"
              : "border-neutral-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
          }`}
        >
          <div className="w-11 sm:w-12 bg-neutral-50 border-r border-neutral-200 flex items-center justify-center shrink-0 text-neutral-600">
            {/* User Silhouette Icon */}
            <svg
              className="w-5 h-5 text-neutral-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            id="name-input"
            data-testid="name-input"
            type="text"
            dir="rtl"
            value={nomComplet}
            onFocus={handleFirstFocus}
            onChange={(e) => {
              setNomComplet(e.target.value);
              lastFieldRef.current = "nom_complet";
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="أدخل اسمك الأول"
            className="w-full px-3.5 py-2.5 text-sm text-neutral-900 text-right font-cairo placeholder:text-neutral-400 focus:outline-none bg-white"
          />
        </div>
        {errors.name && (
          <p className="text-xs text-red-600 mt-1 text-right font-cairo font-medium" dir="rtl">
            {errors.name}
          </p>
        )}
      </div>

      {/* Field 2: Téléphone * */}
      <div>
        <label
          htmlFor="phone-input"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          Téléphone <span className="text-red-500">*</span>
        </label>
        <div
          className={`flex items-stretch rounded-lg border bg-white overflow-hidden transition-all ${
            errors.phone
              ? "border-red-400 ring-1 ring-red-400"
              : "border-neutral-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
          }`}
        >
          <div className="w-11 sm:w-12 bg-neutral-50 border-r border-neutral-200 flex items-center justify-center shrink-0 text-neutral-600">
            {/* Phone Handset Icon */}
            <svg
              className="w-5 h-5 text-neutral-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 4V3z" />
            </svg>
          </div>
          <input
            id="phone-input"
            data-testid="phone-input"
            type="tel"
            dir="rtl"
            value={telephone}
            onFocus={handleFirstFocus}
            onChange={(e) => {
              setTelephone(e.target.value);
              lastFieldRef.current = "telephone";
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            placeholder="أدخل رقم هاتفك"
            className="w-full px-3.5 py-2.5 text-sm text-neutral-900 text-right font-cairo placeholder:text-neutral-400 focus:outline-none bg-white"
          />
        </div>
        {errors.phone && (
          <p className="text-xs text-red-600 mt-1 text-right font-cairo font-medium" dir="rtl">
            {errors.phone}
          </p>
        )}
      </div>

      {/* Field 3: wilaya * */}
      <div>
        <label
          htmlFor="wilaya-select"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          wilaya <span className="text-red-500">*</span>
        </label>
        <div
          className={`relative flex items-stretch rounded-lg border bg-white overflow-hidden transition-all ${
            errors.delivery
              ? "border-red-400 ring-1 ring-red-400"
              : "border-neutral-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
          }`}
        >
          <div className="w-11 sm:w-12 bg-neutral-50 border-r border-neutral-200 flex items-center justify-center shrink-0 text-neutral-600">
            {/* Delivery Truck Icon */}
            <svg
              className="w-5 h-5 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h4"
              />
              <circle cx="6.5" cy="16.5" r="2.5" />
              <circle cx="16.5" cy="16.5" r="2.5" />
            </svg>
          </div>
          <select
            id="wilaya-select"
            data-testid="wilaya-select"
            value={selectedWilayaCode}
            onChange={handleWilayaChange}
            className="w-full pr-8 pl-3.5 py-2.5 text-sm text-neutral-900 text-right font-cairo focus:outline-none bg-white appearance-none cursor-pointer"
          >
            <option value="">اختر الولاية</option>
            {wilayasData.map((w) => (
              <option key={w.code} value={w.code}>
                {w.code} - {w.name_ar}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        {errors.delivery && (
          <p className="text-xs text-red-600 mt-1 text-right font-cairo font-medium" dir="rtl">
            {errors.delivery}
          </p>
        )}
      </div>

      {/* Field 4: baladia * */}
      <div>
        <label
          htmlFor="commune-select"
          className="block text-xs font-semibold text-neutral-800 mb-1"
        >
          baladia <span className="text-red-500">*</span>
        </label>
        <div className="relative flex items-stretch rounded-lg border border-neutral-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <div className="w-11 sm:w-12 bg-neutral-50 border-r border-neutral-200 flex items-center justify-center shrink-0 text-neutral-600">
            {/* Building Icon */}
            <svg
              className="w-5 h-5 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <select
            id="commune-select"
            data-testid="commune-select"
            value={selectedCommune}
            disabled={!selectedWilayaCode}
            onChange={handleCommuneChange}
            className="w-full pr-8 pl-3.5 py-2.5 text-sm text-neutral-900 text-right font-cairo focus:outline-none bg-white appearance-none cursor-pointer disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            <option value="">اختر البلدية</option>
            {communes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Summary Box: Exact ChicOutfit Style with Grey Background */}
      <div className="bg-[#f6f6f7] rounded-xl p-3.5 space-y-2.5 border border-neutral-200/60 mt-3">
        {/* Row 1: Sous-total */}
        <div className="flex items-center justify-between text-sm text-neutral-800">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-neutral-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="font-medium text-xs sm:text-sm">Sous-total</span>
          </div>
          <span className="font-bold text-neutral-900 font-sans">
            {formatPriceDA(offer.prix_dzd)}
          </span>
        </div>

        {/* Row 2: Livraison */}
        <div className="flex items-center justify-between text-sm text-neutral-800">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-neutral-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h4"
              />
              <circle cx="6.5" cy="16.5" r="2.5" />
              <circle cx="16.5" cy="16.5" r="2.5" />
            </svg>
            <span className="font-medium text-xs sm:text-sm">Livraison</span>
          </div>
          <span className="font-bold">
            {isFreeDelivery ? (
              <span className="text-emerald-600 font-bold">مجاني / Gratuit</span>
            ) : hasWilayaSelected ? (
              <span className="text-neutral-900 font-sans">
                {formatPriceDA(effectiveDeliveryPrice)}
              </span>
            ) : (
              <span className="text-red-500 font-bold tracking-widest">--</span>
            )}
          </span>
        </div>

        <hr className="border-t border-neutral-300/80 my-1" />

        {/* Row 3: Total */}
        <div className="flex items-center justify-between text-sm sm:text-base text-neutral-900">
          <div className="flex items-center gap-2 font-bold">
            {/* Calculator/Receipt Icon */}
            <svg
              className="w-4 h-4 text-neutral-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect
                x="4"
                y="2"
                width="16"
                height="20"
                rx="2"
                strokeWidth={2}
                stroke="currentColor"
                fill="none"
              />
              <line x1="8" y1="6" x2="16" y2="6" strokeWidth={2} />
              <circle cx="8" cy="11" r="1" fill="currentColor" />
              <circle cx="12" cy="11" r="1" fill="currentColor" />
              <circle cx="16" cy="11" r="1" fill="currentColor" />
              <circle cx="8" cy="15" r="1" fill="currentColor" />
              <circle cx="12" cy="15" r="1" fill="currentColor" />
              <circle cx="16" cy="15" r="1" fill="currentColor" />
              <circle cx="8" cy="18" r="1" fill="currentColor" />
              <circle cx="12" cy="18" r="1" fill="currentColor" />
              <circle cx="16" cy="18" r="1" fill="currentColor" />
            </svg>
            <span>Total</span>
          </div>
          <span className="font-black text-neutral-900 font-sans">
            {isFreeDelivery || hasWilayaSelected ? (
              formatPriceDA(total)
            ) : (
              <span className="text-neutral-500 font-bold tracking-widest">--</span>
            )}
          </span>
        </div>
      </div>

      {/* CTA Button: High contrast orange/coral with bag icon & reassurance subtext */}
      <button
        type="submit"
        data-testid="submit-btn"
        disabled={isSubmitting}
        className="w-full bg-[#f95721] hover:bg-[#ea4a15] active:scale-[0.99] text-white rounded-xl py-3 px-4 shadow-md shadow-orange-500/20 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed text-center space-y-0.5 mt-2 cursor-pointer"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="font-bold font-cairo text-sm">جاري تأكيد طلبك...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-lg sm:text-xl font-bold font-cairo leading-tight" dir="rtl">
              <svg
                className="w-5 h-5 text-white shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <span>اطلب الآن</span>
            </div>
            <p className="text-center text-xs font-medium text-white/95 font-cairo">
              ما تخلص والو حتى تلحقك الطلبية
            </p>
          </>
        )}
      </button>

      <p className="text-center text-xs text-neutral-400 font-medium font-cairo pt-1" dir="rtl">
        🔒 معلوماتك الشخصية محمية ومستعملة فقط لتوصيل طلبكم
      </p>
    </form>
  );
};
