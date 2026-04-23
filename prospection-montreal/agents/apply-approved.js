const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { normalizeBuildingRecord } = require("./lib/scoring");

const DEFAULT_CSV = path.join(__dirname, "out", "review-queue.csv");
const PROPOSED_FILE = path.join(__dirname, "out", "proposed-additions.json");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && c === ",") {
      fields.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    return row;
  });
}

function loadApprovedIds(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(text);
  const approved = [];
  for (const row of rows) {
    const status = String(row.validation_status || "").trim().toLowerCase();
    if (status !== "approved" && status !== "approuve" && status !== "ok") continue;
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    approved.push(id);
  }
  return approved;
}

async function upsertInBatches(supabase, records, batchSize = 40) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("buildings").upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }
}

async function run() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Fichier CSV introuvable: ${csvPath}`);
  }
  if (!fs.existsSync(PROPOSED_FILE)) {
    throw new Error(`Fichier manquant: ${PROPOSED_FILE} (lance npm run agents:run)`);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises dans .env");
  }

  const approvedIds = loadApprovedIds(csvPath);
  if (approvedIds.length === 0) {
    console.log("Aucune ligne approuvée (validation_status = approved). Rien à pousser.");
    return;
  }

  const proposedPayload = JSON.parse(fs.readFileSync(PROPOSED_FILE, "utf8"));
  const proposedList = proposedPayload.proposed || [];
  const byId = new Map(proposedList.map((r) => [String(r.id), r]));

  const toUpsert = [];
  for (const id of approvedIds) {
    const raw = byId.get(String(id));
    if (!raw) {
      console.warn(`ID ${id} approuvé mais absent de proposed-additions.json — ignoré.`);
      continue;
    }
    toUpsert.push(normalizeBuildingRecord({ ...raw }));
  }

  if (toUpsert.length === 0) {
    console.log("Aucun enregistrement valide à upserter.");
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await upsertInBatches(supabase, toUpsert);
  console.log(`Upsert Supabase terminé: ${toUpsert.length} immeuble(s).`);
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
