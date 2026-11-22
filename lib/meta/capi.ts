import crypto from "crypto";

export interface CapiUserData {
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  country?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
}

export interface CapiEventParams {
  event_name: "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase";
  event_id: string;
  event_source_url: string;
  user_data?: CapiUserData;
  custom_data?: {
    value?: number;
    currency?: string;
    content_name?: string;
    num_items?: number;
    order_id?: string;
    [key: string]: any;
  };
}

function hashSha256(value: string): string {
  const cleaned = value.trim().toLowerCase();
  return crypto.createHash("sha256").update(cleaned).digest("hex");
}

export async function sendCapiEvent(
  params: CapiEventParams
): Promise<{ ok: boolean; status?: number; data?: any }> {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  const testCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !token) {
    console.warn("Meta Pixel or CAPI token unset. Skipping CAPI event:", params.event_name);
    return { ok: false };
  }

  try {
    const rawUserData = params.user_data || {};
    const hashedUserData: Record<string, any> = {};

    // Fields that must be SHA-256 hashed according to Meta Conversions API docs
    if (rawUserData.ph) hashedUserData.ph = hashSha256(rawUserData.ph);
    if (rawUserData.fn) hashedUserData.fn = hashSha256(rawUserData.fn);
    if (rawUserData.ln) hashedUserData.ln = hashSha256(rawUserData.ln);
    if (rawUserData.ct) hashedUserData.ct = hashSha256(rawUserData.ct);
    if (rawUserData.st) hashedUserData.st = hashSha256(rawUserData.st);
    if (rawUserData.country) hashedUserData.country = hashSha256(rawUserData.country);

    // Unhashed browser / attribution fields
    if (rawUserData.client_ip_address) hashedUserData.client_ip_address = rawUserData.client_ip_address;
    if (rawUserData.client_user_agent) hashedUserData.client_user_agent = rawUserData.client_user_agent;
    if (rawUserData.fbp) hashedUserData.fbp = rawUserData.fbp;
    if (rawUserData.fbc) hashedUserData.fbc = rawUserData.fbc;

    const eventPayload: Record<string, any> = {
      event_name: params.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: params.event_id,
      event_source_url: params.event_source_url,
      action_source: "website",
      user_data: hashedUserData,
      custom_data: params.custom_data,
    };

    const requestBody: Record<string, any> = {
      data: [eventPayload],
    };

    if (testCode) {
      requestBody.test_event_code = testCode;
    }

    const endpoint = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const resData = await res.json().catch(() => null);

    if (!res.ok) {
      console.warn("Meta CAPI responded with error status:", res.status, resData);
      return { ok: false, status: res.status, data: resData };
    }

    return { ok: true, status: res.status, data: resData };
  } catch (error) {
    console.warn("Failed to send Meta CAPI event:", error);
    return { ok: false };
  }
}
