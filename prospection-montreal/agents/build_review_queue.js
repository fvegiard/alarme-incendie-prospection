const fs = require("fs");
const path = require("path");

const INPUT_FILE = path.join(__dirname, "out", "proposed-additions.json");
const OUTPUT_FILE = path.join(__dirname, "out", "review-queue.csv");

function csvEscape(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error("Missing proposed additions file. Run npm run agents:run first.");
  }

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const proposed = data.proposed || [];
  const headers = [
    "id",
    "immeuble",
    "zone",
    "priorite",
    "latitude",
    "longitude",
    "annee",
    "etages",
    "decideur_probable",
    "source_inventaire",
    "validation_status",
  ];

  const lines = [headers.map(csvEscape).join(",")];
  for (const row of proposed) {
    const values = [
      row.id,
      row.immeuble,
      row.zone,
      row.priorite,
      row.latitude,
      row.longitude,
      row.annee,
      row.etages,
      row.decideur_probable,
      row.source_inventaire,
      "todo",
    ];
    lines.push(values.map(csvEscape).join(","));
  }

  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"));
  console.log(`Wrote ${proposed.length} rows to ${OUTPUT_FILE}`);
}

run();
