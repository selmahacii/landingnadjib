import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVariants, saveVariant, type Variant } from "../variants";
import * as client from "../client";

vi.mock("../client", () => ({
  readRange: vi.fn(),
  updateRange: vi.fn(),
  appendRow: vi.fn(),
}));

describe("variants Sheets layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEET_ID = "mock-sheet-id";
  });

  it("getVariants parses sheet range into typed Variant[], sorted by ordre, excluding actif=false", async () => {
    const mockRows = [
      ["variant_id", "nom_variante_ar", "supplement_prix_dzd", "image_url", "thumb_url", "ordre", "actif"],
      ["var_beige", "بيج (Beige)", "0", "https://blob/beige.webp", "https://blob/beige_thumb.webp", "2", "TRUE"],
      ["var_inactive", "رمادي", "0", "", "", "9", "FALSE"],
      ["var_noir", "أسود (Noir)", "0", "https://blob/noir.webp", "https://blob/noir_thumb.webp", "1", "TRUE"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const variants = await getVariants();

    expect(variants).toHaveLength(2);
    expect(variants[0].variant_id).toBe("var_noir");
    expect(variants[0].nom_variante_ar).toBe("أسود (Noir)");
    expect(variants[1].variant_id).toBe("var_beige");
  });

  it("saveVariant updates existing row when variant_id exists", async () => {
    const mockRows = [
      ["variant_id", "nom_variante_ar", "supplement_prix_dzd", "image_url", "thumb_url", "ordre", "actif"],
      ["var_noir", "أسود (Noir)", "0", "", "", "1", "TRUE"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const updated: Variant = {
      variant_id: "var_noir",
      nom_variante_ar: "أسود ملكي",
      supplement_prix_dzd: 0,
      image_url: "https://blob/noir_v2.webp",
      thumb_url: "https://blob/noir_thumb_v2.webp",
      ordre: 1,
      actif: true,
    };

    await saveVariant(updated);

    expect(client.updateRange).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Variantes_Produit!A2:G2",
      [["var_noir", "أسود ملكي", 0, "https://blob/noir_v2.webp", "https://blob/noir_thumb_v2.webp", 1, "TRUE"]]
    );
    expect(client.appendRow).not.toHaveBeenCalled();
  });

  it("saveVariant appends row when variant_id does not exist", async () => {
    const mockRows = [
      ["variant_id", "nom_variante_ar", "supplement_prix_dzd", "image_url", "thumb_url", "ordre", "actif"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const newVariant: Variant = {
      variant_id: "var_vert",
      nom_variante_ar: "أخضر (Vert)",
      supplement_prix_dzd: 0,
      image_url: "https://blob/vert.webp",
      thumb_url: "https://blob/vert_thumb.webp",
      ordre: 3,
      actif: true,
    };

    await saveVariant(newVariant);

    expect(client.appendRow).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Variantes_Produit",
      ["var_vert", "أخضر (Vert)", 0, "https://blob/vert.webp", "https://blob/vert_thumb.webp", 3, "TRUE"]
    );
  });
});
