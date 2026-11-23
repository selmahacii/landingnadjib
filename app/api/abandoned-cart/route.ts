import { recordAbandonedCart } from "@/lib/sheets/orders";
import { normalizePhone } from "@/lib/phone";

export async function POST(request: Request) {
  try {
    let body: any = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (body && body.telephone_normalise) {
      const validPhone = normalizePhone(body.telephone_normalise);
      if (validPhone) {
        await recordAbandonedCart({
          ...body,
          telephone_normalise: validPhone,
        });
      }
    }
  } catch (error) {
    // Fire-and-forget: log and swallow error, never break beacon call
    console.warn("Swallowed abandoned-cart recording error:", error);
  }

  return new Response(null, { status: 204 });
}
