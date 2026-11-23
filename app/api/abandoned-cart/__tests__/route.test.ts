import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import * as ordersModule from "@/lib/sheets/orders";

vi.mock("@/lib/sheets/orders", () => ({
  recordAbandonedCart: vi.fn(),
}));

describe("POST /api/abandoned-cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const payload = {
    session_id: "sess_abn_1",
    telephone_normalise: "0661234567",
    nom_complet: "سمير",
  };

  it("calls recordAbandonedCart and responds with 204 status on valid JSON payload", async () => {
    (ordersModule.recordAbandonedCart as any).mockResolvedValue({
      order_id: "ABN-20261122-1234",
    });

    const req = new Request("http://localhost/api/abandoned-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(204);
    expect(ordersModule.recordAbandonedCart).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "sess_abn_1",
        telephone_normalise: "0661234567",
      })
    );
  });

  it("parses sendBeacon text/plain payload defensively and responds with 204", async () => {
    (ordersModule.recordAbandonedCart as any).mockResolvedValue({
      order_id: "ABN-20261122-5678",
    });

    const req = new Request("http://localhost/api/abandoned-cart", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(204);
    expect(ordersModule.recordAbandonedCart).toHaveBeenCalled();
  });

  it("always responds 204 even when recordAbandonedCart throws", async () => {
    (ordersModule.recordAbandonedCart as any).mockRejectedValue(new Error("Database disconnected"));

    const req = new Request("http://localhost/api/abandoned-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(204);
  });
});
