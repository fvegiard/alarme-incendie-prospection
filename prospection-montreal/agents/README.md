# Agents locaux d'enrichissement

## Documentation du plan

- Criteres et libelles UI : [spec/CRITERES.md](spec/CRITERES.md)
- Sources donnees ouvertes (liens) : [sources/SOURCES.md](sources/SOURCES.md)

## Etapes (modules)

1. `discover_wikidata.js` — georecherche Wikipedia (fr) (Montreal, Laval, Longueuil, Brossard) → `out/wikidata-candidates.json`
2. `manual-csv.js` (optionnel) — CSV depose dans `in/manual/` → `out/manual-candidates.json`
3. `enrich_missing.js` — fusionne les candidats (wiki + manuel), diff vs `data.json`, scoring → `out/proposed-additions.json`
4. `build_review_queue.js` — CSV de validation `out/review-queue.csv`
5. `lib/merge-inventory.js` — fusion de `proposed-additions` dans `data.json`

## Executer le plan (recommande)

**Pipeline** : manuel (si CSV) + discover + enrich. Avec **ecriture** `data.json` + rapport :

```bash
npm run agents:execute-plan
```

Avec deploiement Netlify a la fin :

```bash
npm run agents:execute-plan:deploy
```

Sans fusion (seulement generer `proposed-additions.json`) :

```bash
npm run agents:pipeline
```

## Autres raccourcis

| Commande | Role |
|----------|------|
| `npm run agents:run` | discover + enrich (sans merge) |
| `npm run agents:workflow` | discover + enrich + **merge** dans `data.json` (comme execute-plan sans CSV optionnel) |
| `npm run agents:workflow:deploy` | idem + Netlify |
| `npm run agents:ingest:manual` | seulement lire `in/manual/*.csv` |
| `npm run agents:review` | generer le CSV de revue |
| `npm run agents:apply` | appliquer les lignes **approved** du CSV vers Supabase |
| `npm run agents:apply:all` | **upsert tout** `proposed-additions` vers Supabase (service role requis) |
| `npm run agents:sync-local` | recharger `data.json` depuis Supabase |
| `npm run deploy:netlify` | deploiement production |

## Import CSV manuel

1. Placer un fichier `.csv` dans `in/manual/` (colonnes min. : `immeuble`, `latitude`, `longitude`).
2. Option : `in/manual/columns.json` pour renomper les en-tetes.
3. `npm run agents:ingest:manual` puis `npm run agents:run` ou `npm run agents:execute-plan`.

## Fichiers generes (out)

- `wikidata-candidates.json` / `manual-candidates.json` / `proposed-additions.json`
- `missing-buildings.json` — snapshot avant merge (via `merge-inventory`)
- `workflow-report.json` / `pipeline-report.json`
- `review-queue.csv`

## Supabase

- Cle **service** dans `.env` : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `agents:apply:all` pousse toutes les propositions; `agents:apply` n’applique que le CSV valide.
- Puis `npm run agents:sync-local` pour re-aligner `data.json`.

## Prudent

- Valider echantillons (carte, filtres) apres gros merge.
- Ne pas confondre **prospection** et **preuve de conformite** (voir spec).
