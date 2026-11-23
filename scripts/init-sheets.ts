import fs from "fs";
import path from "path";
import { ensureSheetsInitialized } from "../lib/sheets/init";

// Auto-load .env.local or .env if present and environment variables are not already set
function loadEnvFile(file: string) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheetId) {
    console.error("❌ ERREUR : La variable d'environnement GOOGLE_SHEET_ID n'est pas définie.");
    console.error("💡 Astuce : Vérifiez que votre fichier .env.local existe ou lancez :");
    console.error("   npx tsx --env-file=.env.local scripts/init-sheets.ts");
    process.exit(1);
  }

  console.log(`Initialisation des onglets et schémas pour le Google Sheet : ${sheetId}...`);

  try {
    await ensureSheetsInitialized(sheetId);
    console.log("✅ Initialisation réussie ! Les 5 onglets sont prêts :");
    console.log("   1. Commandes_et_Abandons (34 colonnes, validations et couleurs)");
    console.log("   2. Tarifs_Livraison (58 wilayas)");
    console.log("   3. Offres_Packs (Packs 1 et 2 pièces)");
    console.log("   4. Variantes_Produit (5 coloris)");
    console.log("   5. Dashboard_KPI (Formules dynamiques de performance)");
  } catch (error: any) {
    console.error("❌ Échec de l'initialisation du Google Sheet :", error?.message || error);
    process.exit(1);
  }
}

main();
