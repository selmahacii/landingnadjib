import { NextResponse } from "next/server";
import { recordOrder, type OrderInput } from "@/lib/sheets/orders";
import { normalizePhone } from "@/lib/phone";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "بيانات الطلب غير صالحة." },
        { status: 400 }
      );
    }

    const {
      session_id,
      nom_complet,
      telephone_normalise,
      wilaya_code,
      wilaya_nom,
      commune,
      adresse_livraison,
      mode_livraison,
      offre_choisie,
      variante_choisie,
      quantite,
      prix_offre_dzd,
      prix_livraison_dzd,
      total_dzd,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbclid,
      device_navigateur,
      temps_sur_page_sec,
      dernier_champ_rempli,
      notes,
    } = body;

    if (!nom_complet || typeof nom_complet !== "string" || !nom_complet.trim()) {
      return NextResponse.json(
        { error: "يرجى إدخال الاسم واللقب." },
        { status: 400 }
      );
    }

    const validPhone = normalizePhone(telephone_normalise);
    if (!validPhone) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صالح. يرجى إدخال رقم هاتف جزائري صحيح (05/06/07)." },
        { status: 400 }
      );
    }

    if (!wilaya_code) {
      return NextResponse.json(
        { error: "يرجى اختيار الولاية." },
        { status: 400 }
      );
    }

    const orderInput: OrderInput = {
      session_id: session_id || "sess_unknown",
      nom_complet: nomCompletSanitized(nom_complet),
      telephone_normalise: validPhone,
      wilaya_code: String(wilaya_code),
      wilaya_nom: String(wilaya_nom || ""),
      commune: String(commune || ""),
      adresse_livraison: adresse_livraison ? String(adresse_livraison).trim() : "",
      mode_livraison: mode_livraison === "Stop Desk" ? "Stop Desk" : "Domicile",
      offre_choisie: String(offre_choisie || "1 pièce"),
      variante_choisie: String(variante_choisie || "Noir"),
      quantite: parseInt(String(quantite || 1), 10) || 1,
      prix_offre_dzd: parseFloat(String(prix_offre_dzd || 0)) || 0,
      prix_livraison_dzd: parseFloat(String(prix_livraison_dzd || 0)) || 0,
      total_dzd: parseFloat(String(total_dzd || 0)) || 0,
      utm_source: utm_source ? String(utm_source) : undefined,
      utm_medium: utm_medium ? String(utm_medium) : undefined,
      utm_campaign: utm_campaign ? String(utm_campaign) : undefined,
      utm_content: utm_content ? String(utm_content) : undefined,
      utm_term: utm_term ? String(utm_term) : undefined,
      fbclid: fbclid ? String(fbclid) : undefined,
      device_navigateur: device_navigateur ? String(device_navigateur) : undefined,
      temps_sur_page_sec: temps_sur_page_sec !== undefined ? Number(temps_sur_page_sec) : undefined,
      dernier_champ_rempli: dernier_champ_rempli ? String(dernier_champ_rempli) : undefined,
      notes: notes ? String(notes).trim() : undefined,
    };

    // Retry loop: initial attempt + up to 2 retries on failure (total 3 attempts)
    let lastError: any = null;
    let result: { order_id: string; flag_doublon: string } | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await recordOrder(orderInput);
        break;
      } catch (err) {
        lastError = err;
        if (attempt < 3) {
          // Short backoff (50ms in dev/test, up to 100ms)
          await new Promise((r) => setTimeout(r, 50 * attempt));
        }
      }
    }

    if (!result) {
      console.error("All 3 attempts to record order failed:", lastError);
      return NextResponse.json(
        {
          error: "تعذر تسجيل طلبك في الوقت الحالي بسبب ضغط على الخادم. يرجى المحاولة مرة أخرى بعد قليل.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      order_id: result.order_id,
      flag_doublon: result.flag_doublon,
    });
  } catch (error: any) {
    console.error("Unexpected error in /api/order:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع. يرجى إعادة المحاولة." },
      { status: 500 }
    );
  }
}

function nomCompletSanitized(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}
