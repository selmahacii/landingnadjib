import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDeliveryTariffs, saveDeliveryTariff, type DeliveryTariff } from "../delivery";
import * as client from "../client";

vi.mock("../client", () => ({
  readRange: vi.fn(),
  updateRange: vi.fn(),
  appendRow: vi.fn(),
}));

describe("delivery tariffs Sheets layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEET_ID = "mock-sheet-id";
  });

  it("getDeliveryTariffs parses rows into DeliveryTariff[]", async () => {
    const mockRows = [
      ["wilaya_code", "wilaya_ar", "prix_domicile", "prix_stopdesk", "actif"],
      ["16", "الجزائر", "500", "300", "TRUE"],
      ["31", "وهران", "600", "400", "TRUE"],
      ["99", "Inactive", "1000", "800", "FALSE"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const tariffs = await getDeliveryTariffs();

    expect(tariffs).toHaveLength(2);
    expect(tariffs[0]).toEqual({
      wilaya_code: "16",
      wilaya_ar: "الجزائر",
      prix_domicile: 500,
      prix_stopdesk: 300,
      actif: true,
    });
    expect(tariffs[1].wilaya_code).toBe("31");
  });

  it("saveDeliveryTariff updates existing row when wilaya_code exists", async () => {
    const mockRows = [
      ["wilaya_code", "wilaya_ar", "prix_domicile", "prix_stopdesk", "actif"],
      ["16", "الجزائر", "500", "300", "TRUE"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const updated: DeliveryTariff = {
      wilaya_code: "16",
      wilaya_ar: "الجزائر",
      prix_domicile: 450,
      prix_stopdesk: 250,
      actif: true,
    };

    await saveDeliveryTariff(updated);

    expect(client.updateRange).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Tarifs_Livraison!A2:E2",
      [["16", "الجزائر", 450, 250, "TRUE"]]
    );
    expect(client.appendRow).not.toHaveBeenCalled();
  });

  it("saveDeliveryTariff appends row when wilaya_code does not exist", async () => {
    const mockRows = [
      ["wilaya_code", "wilaya_ar", "prix_domicile", "prix_stopdesk", "actif"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const newTariff: DeliveryTariff = {
      wilaya_code: "25",
      wilaya_ar: "قسنطينة",
      prix_domicile: 600,
      prix_stopdesk: 350,
      actif: true,
    };

    await saveDeliveryTariff(newTariff);

    expect(client.appendRow).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Tarifs_Livraison",
      ["25", "قسنطينة", 600, 350, "TRUE"]
    );
  });
});
