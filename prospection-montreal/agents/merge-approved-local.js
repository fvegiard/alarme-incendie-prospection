const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data.json");
const PROPOSED_PATH = path.join(__dirname, "out", "proposed-additions.json");
const REVIEW_PATH = path.join(__dirname, "out", "review-queue.csv");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        cur += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function getApprovedIds() {
  const text = fs.readFileSync(REVIEW_PATH, "utf8");
  const lines = text.split(/\r?\n/).filter((x) => x.trim().length > 0);
  if (lines.length < 2) return new Set();
  const headers = parseCsvLine(lines[0].replace(/^\uFEFF/, ""));
  const idIdx = headers.indexOf("id");
  const statusIdx = headers.indexOf("validation_status");
  const approved = new Set();

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const status = String(cols[statusIdx] || "").trim().toLowerCase();
    if (!["approved", "approuve", "ok"].includes(status)) continue;
    const id = Number(cols[idIdx]);
    if (Number.isFinite(id)) approved.add(id);
  }
  return approved;
}

function run() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const proposed = JSON.parse(fs.readFileSync(PROPOSED_PATH, "utf8")).proposed || [];
  const approved = getApprovedIds();

  const byId = new Map((data.inventory || []).map((row) => [Number(row.id), row]));
  for (const row of proposed) {
    const id = Number(row.id);
    if (approved.has(id)) byId.set(id, row);
  }

  const inventory = Array.from(byId.values()).sort((a, b) => Number(a.id) - Number(b.id));
  data.inventory = inventory;
  data.meta = {
    ...(data.meta || {}),
    total_tours: inventory.length,
    top_prioritaires: inventory.filter((b) => b.priorite === "Très élevée" || b.priorite === "Élevée").length,
    audit_ou_validation: inventory.filter((b) => String(b.mode_action || "").includes("Audit")).length,
    commercial_institutionnel: inventory.filter((b) => b.segment === "Commercial / institutionnel").length,
    condos_syndicats: inventory.filter((b) => b.segment === "Syndicat / condo").length,
    date_generation: new Date().toISOString().split("T")[0],
    version_label: "Local enrichment merged",
  };

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log(`Merged ${approved.size} approved rows. Inventory count: ${inventory.length}`);
}

run();
