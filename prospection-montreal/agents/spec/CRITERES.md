# Criteres d’admissibilite (inventaire prospection)

Cette spec sert a **aligner** les scripts (`agents/`) sur le tableau de bord [`index.html`](../index.html).

## Champs texte (libelles exacts cote UI)

- **priorite** : `Très élevée` | `Élevée` | `Moyenne` | `Faible` (accents importants).
- **statut public prudent** : `1999 et antérieur – audit prioritaire` | `2000-2016 – aucune preuve publique trouvée` | `Récent 2017-2023 – à valider` | `Neuf 2024-2025 – faible probabilité d’écart public` (ou valeur de secours `Validation requise` si annee inconnue).
- **Usage** (filtres) : `Office` | `Residential` | `Hotel` | `Mixed-use` | `Health` | etc. (voir options dans l’UI).

## Scoring (agents/lib/scoring.js)

- `score_anciennete`, `score_usage`, `score_hauteur` → `score_total` → `priorite` et `statut_public` (coherent avec les libelles ci-dessus).

## Zones (agents/lib/zones.js)

- Perimetre grossier en **bbox** : Montréal, Laval, Rive-Sud (Longueuil / Brossard).
- `zone` / `zone_lettre` : inference automatique a **valider** sur le terrain; les fiches B/C/D/… du `data.json` d’origine restent le modele qualitatif cible quand possible.

## Regles de deduplication (agents/lib/dedupe.js)

- Meme **nom normalise** OU distance **<= 120 m** entre un candidat et un immeuble deja en inventaire → considere comme deja connu, non re-propose.

## Limites

- Aucun pipeline automatique ne remplace un **avis juridique** ou une **preuve de conformite**; l’outillage sert a la **prospection commerciale priorisee**.
