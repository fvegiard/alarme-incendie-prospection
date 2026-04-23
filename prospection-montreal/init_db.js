const { Client } = require("pg");
const fs = require("fs");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL in .env (connection string Postgres / pooler Supabase).");
  process.exit(1);
}

const client = new Client({ connectionString });

async function init() {
  await client.connect();
  const sql = fs.readFileSync('schema.sql', 'utf8');
  await client.query(sql);
  console.log('Schema created successfully');
  await client.end();
}

init().catch(e => {
  console.error("Error setting up DB:", e);
  process.exit(1);
});
