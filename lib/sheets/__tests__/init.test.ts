import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureSheetsInitialized, COMMANDES_COLUMNS, TAB_NAMES } from "../init";
import { getSheetsClient } from "../client";

vi.mock("../client", () => {
  const batchUpdateMock = vi.fn().mockResolvedValue({ status: 200 });
  const getSpreadsheetMock = vi.fn();
  const getValuesMock = vi.fn();
  const updateValuesMock = vi.fn().mockResolvedValue({ status: 200 });

  return {
    SheetsConfigError: class SheetsConfigError extends Error {},
    getSheetsClient: vi.fn().mockReturnValue({
      spreadsheets: {
        get: getSpreadsheetMock,
        batchUpdate: batchUpdateMock,
        values: {
          get: getValuesMock,
          update: updateValuesMock,
        },
      },
    }),
  };
});

describe("ensureSheetsInitialized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips tab and header creation when tabs exist and header row is non-empty", async () => {
    const client = await getSheetsClient();
    (client.spreadsheets.get as any).mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 1, title: TAB_NAMES.COMMANDES } },
          { properties: { sheetId: 2, title: TAB_NAMES.TARIFS } },
          { properties: { sheetId: 3, title: TAB_NAMES.OFFRES } },
          { properties: { sheetId: 4, title: TAB_NAMES.VARIANTES } },
        ],
      },
    });

    (client.spreadsheets.values.get as any).mockResolvedValue({
      data: {
        values: [["order_id", "date_creation", "type_entree"]],
      },
    });

    await ensureSheetsInitialized("mock-sheet-id");

    // Idempotent: batchUpdate shouldn't create new tabs
    expect(client.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    // values.update shouldn't overwrite headers
    expect(client.spreadsheets.values.update).not.toHaveBeenCalled();
  });

  it("creates tabs, headers and validations when sheet is fresh", async () => {
    const client = await getSheetsClient();
    (client.spreadsheets.get as any).mockResolvedValue({
      data: {
        sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }],
      },
    });

    (client.spreadsheets.values.get as any).mockResolvedValue({
      data: {
        values: [],
      },
    });

    await ensureSheetsInitialized("mock-sheet-id");

    expect(client.spreadsheets.batchUpdate).toHaveBeenCalled();
    expect(client.spreadsheets.values.update).toHaveBeenCalled();
  });
});
