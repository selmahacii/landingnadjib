import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendCapiEvent } from "../capi";

describe("Meta CAPI tracking (sendCapiEvent)", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ events_received: 1 }),
    });

    process.env = {
      ...originalEnv,
      META_PIXEL_ID: "1234567890",
      META_CAPI_TOKEN: "mock_capi_token",
      META_TEST_EVENT_CODE: "TEST1234",
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it("hashes ph with SHA-256 before building the request body", async () => {
    const rawPhone = "0551234567";

    const res = await sendCapiEvent({
      event_name: "Purchase",
      event_id: "evt_purchase_123",
      event_source_url: "https://example.com/checkout",
      user_data: {
        ph: rawPhone,
        fn: "Ahmed",
        country: "dz",
      },
      custom_data: {
        value: 2000,
        currency: "DZD",
      },
    });

    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const callArgs = (global.fetch as any).mock.calls[0];
    const url = callArgs[0];
    expect(url).toContain("1234567890/events");

    const body = JSON.parse(callArgs[1].body);
    expect(body.test_event_code).toBe("TEST1234");
    const eventData = body.data[0];
    expect(eventData.event_name).toBe("Purchase");
    expect(eventData.event_id).toBe("evt_purchase_123");

    // ph must be a 64-char SHA-256 hex string and NOT the raw phone
    const hashedPh = eventData.user_data.ph;
    expect(hashedPh).toHaveLength(64);
    expect(hashedPh).not.toBe(rawPhone);
    expect(/^[a-f0-9]{64}$/.test(hashedPh)).toBe(true);

    // fn must also be hashed
    expect(eventData.user_data.fn).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(eventData.user_data.fn)).toBe(true);
  });

  it("returns { ok: false } without throwing and without calling fetch when META_CAPI_TOKEN is unset", async () => {
    delete process.env.META_CAPI_TOKEN;

    const res = await sendCapiEvent({
      event_name: "PageView",
      event_id: "evt_pageview_1",
      event_source_url: "https://example.com",
    });

    expect(res).toEqual({ ok: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
