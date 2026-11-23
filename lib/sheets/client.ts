import { google, sheets_v4 } from "googleapis";

export class SheetsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetsConfigError";
  }
}

let cachedSheetsClient: sheets_v4.Sheets | null = null;

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new SheetsConfigError(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables."
    );
  }

  // Robust parsing: strip leading/trailing quotes (single or double) and whitespace
  privateKey = privateKey.trim();
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }

  // Handle all newline escape variants (\\n, \n, literal newlines)
  privateKey = privateKey.replace(/\\n/g, "\n").trim();

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function appendRow(
  sheetId: string,
  tab: string,
  values: unknown[]
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tab}!A:A`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values],
    },
  });
}

export async function readRange(
  sheetId: string,
  range: string
): Promise<unknown[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });
  return (res.data.values as unknown[][]) || [];
}

export async function updateRange(
  sheetId: string,
  range: string,
  values: unknown[][]
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });
}
