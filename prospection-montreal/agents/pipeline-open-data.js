/**
 * Pipeline plan: optional CSV manuel + discover Wikipedia + enrich.
 * --merge  fusionne proposed-additions dans data.json
 * --deploy deploie sur Netlify (apres --merge)
 */
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const { mergeAllProposedIntoDataJson } = require("./lib/merge-inventory");

const ROOT = path.join(__dirname, "..");
const MANUAL_DIR = path.join(ROOT, "in", "manual");

function runNode(script) {
  const p = path.join(__dirname, script);
  const r = spawnSync(process.execPath, [p], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}

function hasManualCsv() {
  if (!fs.existsSync(MANUAL_DIR)) return false;
  return fs.readdirSync(MANUAL_DIR).some((f) => f.endsWith(".csv"));
}

function main() {
  console.log("=== Pipeline donnees ouvertes + Wikipedia ===\n");
  if (hasManualCsv()) {
    console.log("--- in/manual: CSV found → manual-csv.js ---\n");
    runNode("manual-csv.js");
  } else {
    console.log("--- in/manual: no CSV (optional) ---\n");
  }
  console.log("--- discover_wikidata.js ---\n");
  runNode("discover_wikidata.js");
  console.log("--- discover_opendata.js (Overpass + Laval CKAN) ---\n");
  runNode("discover_opendata.js");
  console.log("--- enrich_missing.js ---\n");
  runNode("enrich_missing.js");

  const outReport = {
    finished_at: new Date().toISOString(),
    proposed_path: path.join(__dirname, "out", "proposed-additions.json"),
  };
  if (process.argv.includes("--merge")) {
    console.log("--- merge → data.json ---\n");
    outReport.merge = mergeAllProposedIntoDataJson();
  }
  if (process.argv.includes("--deploy")) {
    console.log("--- netlify deploy --prod ---\n");
    const r = spawnSync("npm", ["run", "deploy:netlify"], { cwd: ROOT, stdio: "inherit", shell: true });
    if (r.status !== 0) process.exit(r.status || 1);
  }
  fs.writeFileSync(path.join(__dirname, "out", "pipeline-report.json"), JSON.stringify(outReport, null, 2));
  console.log("\nReport: agents/out/pipeline-report.json");
}

main();
