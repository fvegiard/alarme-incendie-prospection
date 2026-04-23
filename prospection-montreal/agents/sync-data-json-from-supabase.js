const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DATA_JSON = path.join(__dirname, "..", "data.json");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function computeMeta(buildings) {
  return {
    total_tours: buildings.length,
    top_prioritaires: buildings.filter((b) => b.priorite === "Très élevée" || b.priorite === "Élevée").length,
    audit_ou_validation: buildings.filter((b) => b.mode_action && String(b.mode_action).includes("Audit")).length,
    commercial_institutionnel: buildings.filter((b) => b.segment === "Commercial / institutionnel").length,
    condos_syndicats: buildings.filter((b) => b.segment === "Syndicat / condo").length,
    date_generation: new Date().toISOString().split("T")[0],
    version_label: "Sync Supabase → data.json",
  };
}

async function fetchAllBuildings(supabase) {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from("buildings")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function run() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env");
  }
  if (!fs.existsSync(DATA_JSON)) {
    throw new Error(`data.json introuvable: ${DATA_JSON}`);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const buildings = await fetchAllBuildings(supabase);
  const existing = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));

  const next = {
    ...existing,
    inventory: buildings,
    meta: computeMeta(buildings),
  };

  fs.writeFileSync(DATA_JSON, JSON.stringify(next, null, 2));
  console.log(`data.json mis à jour: ${buildings.length} immeubles.`);
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
