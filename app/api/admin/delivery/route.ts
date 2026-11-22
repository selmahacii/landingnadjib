import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminCookie } from "@/lib/admin-auth";
import { saveDeliveryTariff, type DeliveryTariff } from "@/lib/sheets/delivery";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value;
    if (!token || !verifyAdminCookie(token)) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 401 });
    }

    const body = (await req.json()) as DeliveryTariff;
    if (!body || !body.wilaya_code) {
      return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
    }

    await saveDeliveryTariff({
      wilaya_code: String(body.wilaya_code).padStart(2, "0"),
      wilaya_ar: body.wilaya_ar || "",
      prix_domicile: Number(body.prix_domicile) || 0,
      prix_stopdesk: Number(body.prix_stopdesk) || 0,
      actif: Boolean(body.actif),
    });

    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Save delivery tariff error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء حفظ التعرفة" }, { status: 500 });
  }
}
