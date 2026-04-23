/**
 * Workflow: discover → enrich (missing vs data.json) → write missing list → merge all into data.json.
 * Optional: --deploy  →  netlify deploy --prod (from repo root prospection-montreal)
 */
const path = require("path");
const { spawnSync } = require("child_process");
const { mergeAllProposedIntoDataJson } = require("./lib/merge-inventory");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(__dirname, "out");
const REPORT_PATH = path.join(OUT, "workflow-report.json");

function runNode(scriptFile) {
  const scriptPath = path.join(__dirname, scriptFile);
  const result = spawnSync(process.execPath, [scriptPath], { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function runMergeStep() {
  return mergeAllProposedIntoDataJson();
}

function maybeDeploy() {
  const want = process.argv.includes("--deploy");
  if (!want) return;
  const r = spawnSync("npm", ["run", "deploy:netlify"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
}

function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  console.log("--- Step 1/3: discover ---");
  runNode("discover_wikidata.js");
  console.log("--- Step 2/3: enrich (diff vs data.json) ---");
  runNode("enrich_missing.js");
  console.log("--- Step 3/3: list missing → merge into data.json ---");
  runMergeStep();
  maybeDeploy();
  console.log(`Done. Report: ${REPORT_PATH}`);
}

main();
