const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('prospection.sqlite');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

db.serialize(() => {
  // Create Inventory table
  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY,
    rang INTEGER,
    immeuble TEXT,
    hauteur_m REAL,
    etages INTEGER,
    annee INTEGER,
    usage TEXT,
    zone TEXT,
    zone_lettre TEXT,
    priorite TEXT,
    statut_public TEXT,
    decideur_probable TEXT,
    angle_commercial TEXT,
    raison_priorisation TEXT,
    coord_lat REAL,
    coord_lng REAL
  )`);

  // Clear existing data to avoid duplicates
  db.run("DELETE FROM inventory");

  const stmt = db.prepare(`INSERT INTO inventory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  for (const item of data.inventory) {
    stmt.run(
      item.id, item.rang, item.immeuble, item.hauteur_m, item.etages, item.annee, item.usage, 
      item.zone, item.zone_lettre, item.priorite, item.statut_public, item.decideur_probable, 
      item.angle_commercial, item.raison_priorisation, 
      item.coord ? item.coord[0] : null, 
      item.coord ? item.coord[1] : null
    );
  }
  
  stmt.finalize();
  
  console.log("Database 'prospection.sqlite' created and populated with data from data.json.");
});

db.close();
