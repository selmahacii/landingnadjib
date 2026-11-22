import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import * as ordersModule from "@/lib/sheets/orders";

vi.mock("@/lib/sheets/orders", () => ({
  recordOrder: vi.fn(),
  isDuplicateWithin10Min: vi.fn().mockResolvedValue(false),
}));

describe("POST /api/order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload = {
    session_id: "sess_test",
    nom_complet: "خالد بن محمد",
    telephone_normalise: "0551234567",
    wilaya_code: "16",
    wilaya_nom: "الجزائر",
    commune: "الجزائر الوسطى",
    mode_livraison: "Domicile",
    offre_choisie: "قطعة واحدة (1)",
    variante_choisie: "أسود",
    quantite: 1,
    prix_offre_dzd: 2000,
    prix_livraison_dzd: 400,
    total_dzd: 2400,
  };

  it("returns 200 and { order_id } with valid payload and calls recordOrder", async () => {
    (ordersModule.recordOrder as any).mockResolvedValue({
      order_id: "ORD-20261122-OK12",
      flag_doublon: "",
    });

    const req = new Request("http://localhost/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.order_id).toBe("ORD-20261122-OK12");
    expect(ordersModule.recordOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        telephone_normalise: "0551234567",
      })
    );
  });

  it("returns 400 with an Arabic error when phone is invalid and does not call recordOrder", async () => {
    const invalidPayload = {
      ...validPayload,
      telephone_normalise: "12345", // Invalid
    };

    const req = new Request("http://localhost/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidPayload),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/هاتف|الهاتف/);
    expect(ordersModule.recordOrder).not.toHaveBeenCalled();
  });

  it("retries up to 2 times on rejection and returns 503 with Arabic error on final failure", async () => {
    (ordersModule.recordOrder as any).mockRejectedValue(new Error("Sheets API quota limit"));

    const req = new Request("http://localhost/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.error).toBeTruthy();
    // 1 initial try + 2 retries = 3 calls
    expect(ordersModule.recordOrder).toHaveBeenCalledTimes(3);
  });
});
