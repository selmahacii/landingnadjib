import { NextResponse } from "next/server";
import { sendCapiEvent, type CapiEventParams } from "@/lib/meta/capi";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_name, event_id, event_source_url, user_data = {}, custom_data } = body;

    if (!event_name || !event_id) {
      return NextResponse.json(
        { error: "event_name and event_id are required." },
        { status: 400 }
      );
    }

    // Extract client IP and User-Agent from request headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const capiParams: CapiEventParams = {
      event_name,
      event_id,
      event_source_url: event_source_url || request.url,
      user_data: {
        ...user_data,
        client_ip_address: user_data.client_ip_address || clientIp,
        client_user_agent: user_data.client_user_agent || userAgent,
      },
      custom_data,
    };

    const res = await sendCapiEvent(capiParams);
    return NextResponse.json({ ok: res.ok });
  } catch (error) {
    console.warn("Error processing /api/meta-capi request:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
