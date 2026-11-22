import { ensureSheetsInitialized } from "../lib/sheets/init";

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    console.error("❌ ERREUR : La variable d'environnement GOOGLE_SHEET_ID n'est pas définie.");
    process.exit(1);
  }

  console.log(`Initialisation des onglets et schémas pour le Google Sheet : ${sheetId}...`);

  try {
    await ensureSheetsInitialized(sheetId);
    console.log("✅ Initialisation réussie ! Les 4 onglets, en-têtes et validations sont prêts.");
  } catch (error: any) {
    console.error("❌ Échec de l'initialisation du Google Sheet :", error?.message || error);
    process.exit(1);
  }
}

main();
