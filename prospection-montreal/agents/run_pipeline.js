const { spawnSync } = require("child_process");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function runStep(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  const result = spawnSync(process.execPath, [scriptPath], { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

runStep("discover_wikidata.js");
runStep("enrich_missing.js");

console.log("Pipeline complete: discovery + enrichment finished.");
