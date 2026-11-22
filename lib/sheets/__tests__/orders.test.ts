import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordOrder, recordAbandonedCart, type OrderInput } from "../orders";
import * as client from "../client";

vi.mock("../client", () => ({
  readRange: vi.fn(),
  updateRange: vi.fn(),
  appendRow: vi.fn(),
}));

describe("orders Sheets layer - recordOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEET_ID = "mock-sheet-id";
  });

  const baseOrderInput: OrderInput = {
    session_id: "sess_123",
    nom_complet: "Ahmed Benali",
    telephone_normalise: "0551234567",
    wilaya_code: "16",
    wilaya_nom: "الجزائر",
    commune: "الجزائر الوسطى",
    mode_livraison: "Domicile",
    offre_choisie: "pack_1",
    variante_choisie: "Noir",
    quantite: 1,
    prix_offre_dzd: 2000,
    prix_livraison_dzd: 400,
    total_dzd: 2400,
  };

  it("writes a row with statut_confirmation='En attente', statut_livraison='Non expédiée', flag_doublon='' when no prior row exists in 24h", async () => {
    (client.readRange as any).mockResolvedValue([
      // Header row
      ["order_id", "date_creation", "type_entree", "session_id", "statut_confirmation", "motif_annulation", "statut_livraison", "nom_complet", "telephone_normalise"],
    ]);

    const result = await recordOrder(baseOrderInput);

    expect(result.order_id).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);
    expect(result.flag_doublon).toBe("");

    expect(client.appendRow).toHaveBeenCalledTimes(1);
    const calledRow = (client.appendRow as any).mock.calls[0][2];
    expect(calledRow[0]).toBe(result.order_id); // order_id
    expect(calledRow[2]).toBe("Commande Site"); // type_entree
    expect(calledRow[4]).toBe("En attente"); // statut_confirmation
    expect(calledRow[6]).toBe("Non expédiée"); // statut_livraison
    expect(calledRow[7]).toBe("Ahmed Benali"); // nom_complet
    expect(calledRow[8]).toBe("0551234567"); // telephone_normalise
    expect(calledRow[32]).toBe(""); // flag_doublon
    expect(calledRow).toHaveLength(34);
  });

  it("sets flag_doublon on the new row and NEVER modifies prior row when same phone ordered within 24h", async () => {
    const existingDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    (client.readRange as any).mockResolvedValue([
      ["order_id", "date_creation", "type_entree", "session_id", "statut_confirmation", "motif_annulation", "statut_livraison", "nom_complet", "telephone_normalise"],
      ["ORD-20261122-PREV", existingDate, "Commande Site", "old_sess", "En attente", "", "Non expédiée", "Ahmed", "0551234567"],
    ]);

    const result = await recordOrder(baseOrderInput);

    expect(result.flag_doublon).toContain("⚠️ Doublon tel (24h) - voir ORD-20261122-PREV");
    expect(client.appendRow).toHaveBeenCalledTimes(1);
    const calledRow = (client.appendRow as any).mock.calls[0][2];
    expect(calledRow[32]).toContain("⚠️ Doublon tel (24h) - voir ORD-20261122-PREV");

    // Critical non-negotiable rule: NEVER mutate or overwrite the existing row
    expect(client.updateRange).not.toHaveBeenCalled();
  });

  it("recordAbandonedCart returns { skipped: true } and never calls appendRow when Commande Site exists for session_id", async () => {
    (client.readRange as any).mockResolvedValue([
      ["order_id", "date_creation", "type_entree", "session_id"],
      ["ORD-20261122-1111", "2026-11-22", "Commande Site", "sess_existing"],
    ]);

    const result = await recordAbandonedCart({
      session_id: "sess_existing",
      telephone_normalise: "0661234567",
    });

    expect(result).toEqual({ skipped: true });
    expect(client.appendRow).not.toHaveBeenCalled();
  });

  it("recordAbandonedCart writes statut_confirmation='En attente' when no Commande Site exists", async () => {
    (client.readRange as any).mockResolvedValue([
      ["order_id", "date_creation", "type_entree", "session_id"],
      ["ABN-20261122-0000", "2026-11-22", "Panier Abandonné", "other_sess"],
    ]);

    const result = await recordAbandonedCart({
      session_id: "sess_fresh",
      telephone_normalise: "0661234567",
      nom_complet: "Karim",
    });

    expect((result as any).order_id).toMatch(/^ABN-\d{8}-[A-Z0-9]{4}$/);
    expect(client.appendRow).toHaveBeenCalledTimes(1);
    const calledRow = (client.appendRow as any).mock.calls[0][2];
    expect(calledRow[2]).toBe("Panier Abandonné");
    expect(calledRow[4]).toBe("En attente"); // statut_confirmation
    expect(calledRow[6]).toBe("Non expédiée"); // statut_livraison
    expect(calledRow[8]).toBe("0661234567");
    expect(calledRow).toHaveLength(34);
  });
});
