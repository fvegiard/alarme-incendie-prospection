const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DEFAULT_DATA = path.join(ROOT, "data.json");
const OUT = path.join(__dirname, "..", "out");
const PROPOSED_PATH = path.join(OUT, "proposed-additions.json");
const MISSING_PATH = path.join(OUT, "missing-buildings.json");
const REPORT_PATH = path.join(OUT, "workflow-report.json");

function computeMeta(inventory) {
  return {
    total_tours: inventory.length,
    top_prioritaires: inventory.filter((b) => b.priorite === "Très élevée" || b.priorite === "Élevée").length,
    audit_ou_validation: inventory.filter((b) => String(b.mode_action || "").includes("Audit")).length,
    commercial_institutionnel: inventory.filter((b) => b.segment === "Commercial / institutionnel").length,
    condos_syndicats: inventory.filter((b) => b.segment === "Syndicat / condo").length,
    date_generation: new Date().toISOString().split("T")[0],
    version_label: "Workflow list-and-add",
  };
}

/**
 * @param {object} [opts]
 * @param {string} [opts.dataPath]
 */
function mergeAllProposedIntoDataJson(opts = {}) {
  const dataPath = opts.dataPath || DEFAULT_DATA;
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const proposedPayload = JSON.parse(fs.readFileSync(PROPOSED_PATH, "utf8"));
  const proposed = proposedPayload.proposed || [];
  const beforeCount = (data.inventory || []).length;

  const missingPayload = {
    generated_at: new Date().toISOString(),
    source: proposedPayload.generated_at || null,
    count: proposed.length,
    buildings: proposed,
  };
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(MISSING_PATH, JSON.stringify(missingPayload, null, 2));
  console.log(`Listed ${proposed.length} missing building(s) → ${MISSING_PATH}`);

  if (proposed.length === 0) {
    const report = {
      finished_at: new Date().toISOString(),
      step: "merge_skipped_empty",
      inventory_before: beforeCount,
      inventory_after: beforeCount,
      merged_count: 0,
    };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    return report;
  }

  const byId = new Map((data.inventory || []).map((row) => [Number(row.id), row]));
  for (const row of proposed) {
    byId.set(Number(row.id), row);
  }
  const inventory = Array.from(byId.values()).sort((a, b) => Number(a.id) - Number(b.id));
  data.inventory = inventory;
  data.meta = { ...(data.meta || {}), ...computeMeta(inventory) };
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`Merged ${proposed.length} row(s) into data.json. Inventory: ${beforeCount} → ${inventory.length}`);

  const report = {
    finished_at: new Date().toISOString(),
    step: "merged",
    inventory_before: beforeCount,
    inventory_after: inventory.length,
    merged_count: proposed.length,
    merged_ids: proposed.map((r) => r.id),
    merged_names: proposed.map((r) => r.immeuble),
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  return report;
}

module.exports = { computeMeta, mergeAllProposedIntoDataJson };
