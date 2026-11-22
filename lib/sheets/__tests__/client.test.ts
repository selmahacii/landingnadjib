import { describe, it, expect, vi, beforeEach } from "vitest";
import { appendRow, readRange, updateRange, getSheetsClient, SheetsConfigError } from "../client";
import { google } from "googleapis";

vi.mock("googleapis", () => {
  const appendMock = vi.fn().mockResolvedValue({ status: 200 });
  const getMock = vi.fn().mockResolvedValue({
    data: { values: [["header1", "header2"], ["val1", "val2"]] },
  });
  const updateMock = vi.fn().mockResolvedValue({ status: 200 });

  return {
    google: {
      auth: {
        JWT: vi.fn().mockImplementation(() => ({
          authorize: vi.fn().mockResolvedValue({}),
        })),
      },
      sheets: vi.fn().mockReturnValue({
        spreadsheets: {
          values: {
            append: appendMock,
            get: getMock,
            update: updateMock,
          },
        },
      }),
    },
  };
});

describe("Google Sheets Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "test@serviceaccount.com",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
    };
  });

  it("throws SheetsConfigError when credentials are missing", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    await expect(getSheetsClient()).rejects.toThrow(SheetsConfigError);
  });

  it("appendRow calls spreadsheets.values.append with correct params", async () => {
    await appendRow("test-sheet-id", "Commandes_et_Abandons", ["val1", "val2"]);

    const sheets = await getSheetsClient();
    expect(sheets.spreadsheets.values.append).toHaveBeenCalledWith({
      spreadsheetId: "test-sheet-id",
      range: "Commandes_et_Abandons!A:A",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["val1", "val2"]],
      },
    });
  });

  it("readRange calls spreadsheets.values.get and returns rows", async () => {
    const rows = await readRange("test-sheet-id", "Offres_Packs!A1:J10");
    expect(rows).toEqual([["header1", "header2"], ["val1", "val2"]]);
  });

  it("updateRange calls spreadsheets.values.update with correct params", async () => {
    await updateRange("test-sheet-id", "Offres_Packs!A2:J2", [["new1", "new2"]]);

    const sheets = await getSheetsClient();
    expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith({
      spreadsheetId: "test-sheet-id",
      range: "Offres_Packs!A2:J2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["new1", "new2"]],
      },
    });
  });
});
