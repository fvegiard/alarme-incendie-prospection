# Workflow for Claude Code: Automated Building Prospecting

When the user asks you (Claude Code CLI) to "find more buildings in Laval/South Shore" or "prospect new buildings", follow this exact standard operating procedure (SOP).

## Step 1: Research & Discovery
- Use your web search tools to identify target buildings (Commercial, Institutional, or large Condo Syndicates) located specifically in **Laval** or the **South Shore** (Longueuil, Brossard, etc.).
- Focus on targets relevant to fire alarm/security prospecting (e.g., aging infrastructure, tall high-rises, hospitals).
- Gather exact data: Name, Height (m), Floors, Year Built, Latitude, Longitude, and primary Usage.

## Step 2: Data Formatting (The Schema Pattern)
Format the gathered data perfectly against the Supabase `buildings` table schema. Apply the following strict pattern logic:
- `immeuble`: Name of the building + (City). Example: "Tour de la Cité (Laval)"
- `zone`: Specific neighborhood (e.g., "Laval - Chomedey", "Longueuil - Métro").
- `zone_lettre`: Set to **"L"** for Laval, **"S"** for South Shore.
- `age_2026`: Calculate `2026 - annee`.
- **Scoring System**:
  - `score_anciennete`: 5 (pre-1980), 4 (1980-1989), 3 (1990-1999), 2 (2000-2010), 1 (post-2010).
  - `score_usage`: 5 (Hospital/Institutional/Industrial), 3 (Office/Mixed), 1 (Residential Condo).
  - `score_hauteur`: 3 (> 25 floors), 2 (15-25 floors), 1 (< 15 floors).
  - `score_total`: Sum of the three scores.
- `priorite`: 
  - `score_total` >= 10: "Très élevée"
  - `score_total` 8-9: "Élevée"
  - `score_total` 5-7: "Moyenne"
  - `score_total` < 5: "Basse"
- `segment`: Must be "Syndicat / condo" or "Commercial / institutionnel".

## Step 3: Database ID & Insertion
1. **Read Credentials:** Extract `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the local `.env` file.
2. **Write Injection Script:** Create a temporary `insert_temp.js` file using `@supabase/supabase-js`.
3. **Resolve IDs:** The script MUST first query `supabase.from('buildings').select('id').order('id', { ascending: false }).limit(1)` to get the highest existing ID, and then assign incrementing IDs (max + 1, max + 2) to the new buildings.
4. **Execute & Clean:** Run the script using `node insert_temp.js` to push the data, check for errors, and then delete the temporary script.

## Step 4: Reporting
Output a clean, readable Markdown table to the user listing the newly injected buildings, their calculated priority, and their region.
