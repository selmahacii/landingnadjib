import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOffers, saveOffer, type Offer } from "../offers";
import * as client from "../client";

vi.mock("../client", () => ({
  readRange: vi.fn(),
  updateRange: vi.fn(),
  appendRow: vi.fn(),
}));

describe("offers Sheets layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEET_ID = "mock-sheet-id";
  });

  it("getOffers parses sheet range into typed Offer[], sorted by ordre, excluding actif=false", async () => {
    const mockRows = [
      // Header
      ["offer_id", "titre_ar", "quantite", "prix_dzd", "prix_barre_dzd", "badge_ar", "livraison_gratuite", "par_defaut", "ordre", "actif"],
      // Offer 2 (ordre 2)
      ["pack_2", "قطعتين (2)", "2", "3500", "4000", "الأكثر طلباً", "TRUE", "TRUE", "2", "TRUE"],
      // Inactive offer
      ["pack_3", "3 قطع", "3", "5000", "6000", "", "FALSE", "FALSE", "3", "FALSE"],
      // Offer 1 (ordre 1)
      ["pack_1", "قطعة واحدة (1)", "1", "2000", "2500", "", "FALSE", "FALSE", "1", "TRUE"],
    ];

    (client.readRange as any).mockResolvedValue(mockRows);

    const offers = await getOffers();

    expect(offers).toHaveLength(2);
    expect(offers[0].offer_id).toBe("pack_1");
    expect(offers[0].prix_dzd).toBe(2000);
    expect(offers[0].livraison_gratuite).toBe(false);

    expect(offers[1].offer_id).toBe("pack_2");
    expect(offers[1].prix_dzd).toBe(3500);
    expect(offers[1].livraison_gratuite).toBe(true);
    expect(offers[1].par_defaut).toBe(true);
  });

  it("saveOffer updates existing row when offer_id exists", async () => {
    const mockRows = [
      ["offer_id", "titre_ar", "quantite", "prix_dzd", "prix_barre_dzd", "badge_ar", "livraison_gratuite", "par_defaut", "ordre", "actif"],
      ["pack_1", "قطعة واحدة (1)", "1", "2000", "2500", "", "FALSE", "FALSE", "1", "TRUE"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const updatedOffer: Offer = {
      offer_id: "pack_1",
      titre_ar: "قطعة واحدة - تخفيض",
      quantite: 1,
      prix_dzd: 1900,
      prix_barre_dzd: 2500,
      badge_ar: "عرض خاص",
      livraison_gratuite: false,
      par_defaut: true,
      ordre: 1,
      actif: true,
    };

    await saveOffer(updatedOffer);

    expect(client.updateRange).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Offres_Packs!A2:J2",
      [["pack_1", "قطعة واحدة - تخفيض", 1, 1900, 2500, "عرض خاص", "FALSE", "TRUE", 1, "TRUE"]]
    );
    expect(client.appendRow).not.toHaveBeenCalled();
  });

  it("saveOffer appends row when offer_id does not exist", async () => {
    const mockRows = [
      ["offer_id", "titre_ar", "quantite", "prix_dzd", "prix_barre_dzd", "badge_ar", "livraison_gratuite", "par_defaut", "ordre", "actif"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const newOffer: Offer = {
      offer_id: "pack_new",
      titre_ar: "عرض جديد",
      quantite: 2,
      prix_dzd: 3500,
      prix_barre_dzd: 4000,
      badge_ar: "",
      livraison_gratuite: true,
      par_defaut: false,
      ordre: 2,
      actif: true,
    };

    await saveOffer(newOffer);

    expect(client.appendRow).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Offres_Packs",
      ["pack_new", "عرض جديد", 2, 3500, 4000, "", "TRUE", "FALSE", 2, "TRUE"]
    );
    expect(client.updateRange).not.toHaveBeenCalled();
  });
});
