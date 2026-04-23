/**
 * Upsert tous les enregistrements de out/proposed-additions.json vers Supabase (service role).
 * Utile apres un enrich sans etape de validation CSV.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { normalizeBuildingRecord } = require("./lib/scoring");

const PROPOSED = path.join(__dirname, "out", "proposed-additions.json");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function upsertBatches(supabase, records, size = 40) {
  for (let i = 0; i < records.length; i += size) {
    const batch = records.slice(i, i + size);
    const { error } = await supabase.from("buildings").upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }
}

async function run() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Manque SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY dans .env — abandon.");
    process.exit(1);
  }
  if (!fs.existsSync(PROPOSED)) {
    console.error("Fichier manquant: out/proposed-additions.json");
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(PROPOSED, "utf8"));
  const proposed = payload.proposed || [];
  if (proposed.length === 0) {
    console.log("Rien a pousser (proposed vide).");
    return;
  }
  const records = proposed.map((r) => normalizeBuildingRecord({ ...r }));
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await upsertBatches(supabase, records);
  console.log(`Supabase: ${records.length} ligne(s) upsert (buildings).`);
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
