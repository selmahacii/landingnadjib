import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSiteSettings, saveSiteSettings, type SiteSettings } from "../settings";
import * as client from "../client";

vi.mock("../client", () => ({
  readRange: vi.fn(),
  updateRange: vi.fn(),
  appendRow: vi.fn(),
}));

describe("site settings Sheets layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_SHEET_ID = "mock-sheet-id";
  });

  it("getSiteSettings returns default values when readRange returns empty array or throws an error", async () => {
    (client.readRange as any).mockResolvedValue([]);
    const defaultSettings = await getSiteSettings();

    expect(defaultSettings).toEqual({
      header_bg_color: "#171717",
      header_text_color: "#fbbf24",
      header_text_ar: "🚚 توصيل متوفر لـ 58 ولاية | 💵 الدفع عند الاستلام بعد معاينة السلعة",
      main_image_url: "",
    });

    // Test when readRange throws
    (client.readRange as any).mockRejectedValue(new Error("Sheet tab not found"));
    const fallbackSettings = await getSiteSettings();

    expect(fallbackSettings).toEqual({
      header_bg_color: "#171717",
      header_text_color: "#fbbf24",
      header_text_ar: "🚚 توصيل متوفر لـ 58 ولاية | 💵 الدفع عند الاستلام بعد معاينة السلعة",
      main_image_url: "",
    });
  });

  it("getSiteSettings parses a mocked 3-row response correctly", async () => {
    const mockRows = [
      ["cle", "valeur"],
      ["header_bg_color", "#0f172a"],
      ["header_text_color", "#ffffff"],
      ["header_text_ar", "عرض خاص لليوم فقط"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const settings = await getSiteSettings();

    expect(settings).toEqual({
      header_bg_color: "#0f172a",
      header_text_color: "#ffffff",
      header_text_ar: "عرض خاص لليوم فقط",
      main_image_url: "",
    });
  });

  it("saveSiteSettings calls updateRange/appendRow for each key given", async () => {
    // Existing rows only have header_bg_color
    const mockRows = [
      ["cle", "valeur"],
      ["header_bg_color", "#171717"],
    ];
    (client.readRange as any).mockResolvedValue(mockRows);

    const newSettings: SiteSettings = {
      header_bg_color: "#0f172a",
      header_text_color: "#e2e8f0",
      header_text_ar: "توصيل سريع ومجاني",
    };

    await saveSiteSettings(newSettings);

    // header_bg_color was at row index 1 (sheet row 2) -> updateRange
    expect(client.updateRange).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Parametres_Site!A2:B2",
      [["header_bg_color", "#0f172a"]]
    );

    // header_text_color and header_text_ar didn't exist -> appendRow
    expect(client.appendRow).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Parametres_Site",
      ["header_text_color", "#e2e8f0"]
    );
    expect(client.appendRow).toHaveBeenCalledWith(
      "mock-sheet-id",
      "Parametres_Site",
      ["header_text_ar", "توصيل سريع ومجاني"]
    );
  });
});
