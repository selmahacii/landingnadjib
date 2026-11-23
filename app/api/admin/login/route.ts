import { NextRequest, NextResponse } from "next/server";
import { checkPinRateLimit, signAdminCookie } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    if (!checkPinRateLimit(ip)) {
      return NextResponse.json(
        { error: "عدد المحاولات كبير جداً. يرجى الانتظار 15 دقيقة." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    const secret = process.env.ADMIN_SECRET_KEY;
    if (!secret || !pin || pin !== secret) {
      return NextResponse.json(
        { error: "رمز الدخول غير صحيح" },
        { status: 401 }
      );
    }

    const token = signAdminCookie();
    const isProd = process.env.NODE_ENV === "production";

    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_session", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      secure: isProd,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
