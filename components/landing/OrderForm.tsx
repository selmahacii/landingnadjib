import React, { useState, useEffect, useRef } from "react";
import { normalizePhone } from "@/lib/phone";
import { safeStorage } from "@/lib/safeStorage";
import { getOrCreateSessionId, captureAttribution } from "@/lib/session";
import { calculateTotal } from "@/lib/pricing";
import { trackPixelEvent } from "@/lib/meta/pixel";
import type { Offer } from "@/lib/sheets/offers";
import type { Variant } from "@/lib/sheets/variants";
import type { DeliverySelection } from "./WilayaCommuneSelect";

interface OrderFormProps {
  offer: Offer;
  variant: Variant;
  delivery: DeliverySelection | null;
  onSubmitSuccess: (order_id: string, summary: any) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  offer,
  variant,
  delivery,
  onSubmitSuccess,
}) => {
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [errors, setErrors] = useState<{ name?: string; phone?: string; delivery?: string; global?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const lastFieldRef = useRef<string>("");
  const abandonedSentRef = useRef<boolean>(false);
  const orderSubmittedRef = useRef<boolean>(false);

  const handleFirstFocus = () => {
    const sessionId = getOrCreateSessionId();
    if (!safeStorage.getItem(`cod_ic_${sessionId}`)) {
      safeStorage.setItem(`cod_ic_${sessionId}`, "1");
      const eventId = `ic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      trackPixelEvent("InitiateCheckout", { value: offer.prix_dzd, currency: "DZD" }, eventId);
      fetch("/api/meta-capi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_name: "InitiateCheckout",
          event_id: eventId,
          event_source_url: typeof window !== "undefined" ? window.location.href : "",
          custom_data: { value: offer.prix_dzd, currency: "DZD" },
        }),
      }).catch(() => {});
    }
  };

  // Send Abandoned Cart Beacon helper
  const sendAbandonedBeacon = (phoneNorm: string) => {
    if (abandonedSentRef.current || orderSubmittedRef.current) return;
    const sessionId = getOrCreateSessionId();
    if (safeStorage.getItem(`cod_abn_${sessionId}`)) return;

    abandonedSentRef.current = true;
    safeStorage.setItem(`cod_abn_${sessionId}`, "1");

    const attribution = captureAttribution();
    const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000);
    const deliveryPrice = delivery?.wilaya_code ? delivery.prix_livraison : 0;
    const total = calculateTotal({ offer, deliveryPrice });

    const payload = JSON.stringify({
      session_id: sessionId,
      telephone_normalise: phoneNorm,
      nom_complet: nomComplet,
      wilaya_code: delivery?.wilaya_code || "",
      wilaya_nom: delivery?.wilaya_nom || "",
      commune: delivery?.commune || "",
      adresse_livraison: adresse,
      mode_livraison: delivery?.mode_livraison || "Domicile",
      offre_choisie: offer?.titre_ar || "",
      variante_choisie: variant?.nom_variante_ar || "",
      quantite: offer?.quantite || 1,
      prix_offre_dzd: offer?.prix_dzd || 0,
      prix_livraison_dzd: deliveryPrice,
      total_dzd: total,
      device_navigateur: typeof navigator !== "undefined" ? navigator.userAgent : "",
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

  // 45s Timer and visibilitychange listeners
  useEffect(() => {
    const phoneNorm = normalizePhone(telephone);
    if (!phoneNorm) return;

    // 45-second timer
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
  }, [telephone, nomComplet, delivery, offer, variant, adresse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot anti-bot check
    if (honeypot) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    // Client validations
    const newErrors: typeof errors = {};
    if (!nomComplet.trim()) {
      newErrors.name = "يرجى إدخال الاسم واللقب";
    }

    const normalizedTel = normalizePhone(telephone);
    if (!normalizedTel) {
      newErrors.phone = "يرجى إدخال رقم هاتف صحيح (05/06/07)";
    }

    if (!delivery?.wilaya_code) {
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
      const deliveryPrice = delivery?.wilaya_code ? delivery.prix_livraison : 0;
      const total = calculateTotal({ offer, deliveryPrice });

      const orderPayload = {
        session_id: sessionId,
        nom_complet: nomComplet.trim(),
        telephone_normalise: normalizedTel!,
        wilaya_code: delivery!.wilaya_code,
        wilaya_nom: delivery!.wilaya_nom,
        commune: delivery!.commune || "",
        adresse_livraison: adresse.trim(),
        mode_livraison: delivery!.mode_livraison,
        offre_choisie: offer.titre_ar,
        variante_choisie: variant.nom_variante_ar,
        quantite: offer.quantite,
        prix_offre_dzd: offer.prix_dzd,
        prix_livraison_dzd: deliveryPrice,
        total_dzd: total,
        device_navigateur: typeof navigator !== "undefined" ? navigator.userAgent : "",
        temps_sur_page_sec: elapsedSec,
        dernier_champ_rempli: lastFieldRef.current,
        notes: notes.trim(),
        ...attribution,
      };

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء تسجيل طلبكم. يرجى المحاولة مرة أخرى.");
      }

      orderSubmittedRef.current = true;

      // Deduplicated browser Purchase pixel
      if (data.event_id) {
        trackPixelEvent("Purchase", { value: total, currency: "DZD" }, data.event_id);
      }

      onSubmitSuccess(data.order_id, {
        order_id: data.order_id,
        nom: nomComplet,
        offre: offer.titre_ar,
        variante: variant.nom_variante_ar,
        quantite: offer.quantite,
        wilaya: delivery!.wilaya_nom,
        commune: delivery!.commune,
        total: total,
      });
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        global: err.message || "تعذر إرسال الطلب. يرجى التحقق من الاتصال وإعادة المحاولة.",
      }));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot field (hidden from real users) */}
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

      {/* Global submission error banner */}
      {errors.global && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
          {errors.global}
        </div>
      )}

      {/* Nom complet */}
      <div>
        <label htmlFor="name-input" className="block text-sm font-semibold text-neutral-800 mb-1.5">
          الاسم واللقب *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <input
            id="name-input"
            data-testid="name-input"
            type="text"
            value={nomComplet}
            onFocus={handleFirstFocus}
            onChange={(e) => {
              setNomComplet(e.target.value);
              lastFieldRef.current = "nom_complet";
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="مثال: يوسف بلحاج"
            className={`w-full bg-white border rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 transition-colors ${
              errors.name
                ? "border-red-400 focus:ring-red-400"
                : "border-neutral-300 focus:ring-amber-500 focus:border-amber-500"
            }`}
          />
        </div>
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      {/* Téléphone */}
      <div>
        <label htmlFor="phone-input" className="block text-sm font-semibold text-neutral-800 mb-1.5">
          رقم الهاتف *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <input
            id="phone-input"
            data-testid="phone-input"
            type="tel"
            dir="ltr"
            value={telephone}
            onFocus={handleFirstFocus}
            onChange={(e) => {
              setTelephone(e.target.value);
              lastFieldRef.current = "telephone";
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            placeholder="05 / 06 / 07 XX XX XX XX"
            className={`w-full bg-white border rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-neutral-900 text-right focus:outline-none focus:ring-2 transition-colors ${
              errors.phone
                ? "border-red-400 focus:ring-red-400"
                : "border-neutral-300 focus:ring-amber-500 focus:border-amber-500"
            }`}
          />
        </div>
        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
      </div>

      {/* Adresse de livraison (optionnelle) */}
      <div>
        <label htmlFor="address-input" className="block text-sm font-semibold text-neutral-800 mb-1.5">
          عنوان التوصيل (اختياري)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            id="address-input"
            type="text"
            value={adresse}
            onChange={(e) => {
              setAdresse(e.target.value);
              lastFieldRef.current = "adresse";
            }}
            placeholder="الحي، رقم المنزل أو معْلَم قريب..."
            className="w-full bg-white border border-neutral-300 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* Delivery validation message if missing */}
      {errors.delivery && <p className="text-xs text-red-600">{errors.delivery}</p>}

      {/* Submit button */}
      <button
        type="submit"
        data-testid="submit-btn"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-amber-600/30 hover:shadow-xl transition-all duration-200 transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>جاري تأكيد طلبك...</span>
          </>
        ) : (
          <span>اضغط هنا لتأكيد الطلب — الدفع عند الاستلام</span>
        )}
      </button>

      <p className="text-center text-xs text-neutral-400 font-medium">
        🔒 معلوماتك الشخصية محمية ومستعملة فقط لتوصيل طلبكم
      </p>
    </form>
  );
};
