import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminCookie } from "@/lib/admin-auth";
import { saveSiteSettings, type SiteSettings } from "@/lib/sheets/settings";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value;
    if (!token || !verifyAdminCookie(token)) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 401 });
    }

    const body = (await req.json()) as SiteSettings;
    if (!body) {
      return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
    }

    await saveSiteSettings({
      header_bg_color: body.header_bg_color || "#171717",
      header_text_color: body.header_text_color || "#fbbf24",
      header_text_ar: body.header_text_ar ?? "",
    });

    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Save site settings error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء حفظ الإعدادات" }, { status: 500 });
  }
}
