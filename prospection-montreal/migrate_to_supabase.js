const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Please provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.");
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateData() {
  try {
    console.log("Reading data.json...");
    const rawData = fs.readFileSync('data.json', 'utf8');
    const data = JSON.parse(rawData);

    if (!data.inventory || !Array.isArray(data.inventory)) {
      throw new Error("Invalid data.json format. Expected 'inventory' array.");
    }

    console.log(`Found ${data.inventory.length} records. Uploading to Supabase...`);

    // Insert data into 'buildings' table
    const cleanData = data.inventory.map(({ coord, ...rest }) => rest);
    const { data: insertedData, error } = await supabase
      .from('buildings')
      .upsert(cleanData, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  }
}

migrateData();
