import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminCookie } from "@/lib/admin-auth";
import { saveOffer, type Offer } from "@/lib/sheets/offers";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value;
    if (!token || !verifyAdminCookie(token)) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 401 });
    }

    const body = (await req.json()) as Offer;
    if (!body || !body.offer_id) {
      return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
    }

    await saveOffer({
      offer_id: String(body.offer_id).trim(),
      titre_ar: body.titre_ar || "",
      quantite: Number(body.quantite) || 1,
      prix_dzd: Number(body.prix_dzd) || 0,
      prix_barre_dzd: Number(body.prix_barre_dzd) || 0,
      badge_ar: body.badge_ar || "",
      livraison_gratuite: Boolean(body.livraison_gratuite),
      par_defaut: Boolean(body.par_defaut),
      ordre: Number(body.ordre) || 0,
      actif: Boolean(body.actif),
    });

    revalidatePath("/");
    revalidatePath("/admin/offers");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Save offer error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء حفظ العرض" }, { status: 500 });
  }
}
