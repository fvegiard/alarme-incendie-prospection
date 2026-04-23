# Sources recommandees (Montréal, Laval, Rive-Sud)

A combiner avec la decouverte **Wikipedia** (scripts) et, si besoin, des imports **CSV** dans `in/manual/`.

## National / QC

- **Open Database of Buildings (Statistique Canada)** — methodologie et paquets (QC) : [Metadonnees ODB](https://www150.statcan.gc.ca/n1/pub/34-26-0001/2018001/metadata-eng.htm), [page produit](https://www150.statcan.gc.ca/n1/pub/34-26-0001/342600012018001-eng.htm)
- **Donnees ouvertes du gouvernement du Canada** — permis construction Montreal (ex. jeu relie a la Ville) : [Portail](https://open.canada.ca/data/en/dataset/d90eaf1b-2de8-43f0-923a-27a620ecdf41)

## Montréal

- **Ville de Montréal — donnees ouvertes** (catalogue) : [Article plateforme](https://montreal.ca/en/articles/open-data-platform-easy-access-10641)

## Laval

- **Referentiel de batiment** : [jeu sur Donnees Quebec](https://www.donneesquebec.ca/recherche/dataset/referentiel-de-batiment)
- **Permis de construction** : [jeu](https://www.donneesquebec.ca/recherche/dataset/permis-de-construction) — organisation `ville-de-laval`
- **Portail ville** : [Donnees ouvertes Laval](https://www.laval.ca/organisation-municipale/portrait-ville-laval/donnees-ouvertes/)

## Rive-Sud (Longueuil, agglomeration)

- **Catalogue Longueuil** sur Donnees Quebec : [recherche organisation](https://www.donneesquebec.ca/recherche/fr/dataset?organization=ville-de-longueuil)
- **Inventaire batiments (exemple de jeu)** : [open.canada - buildings Longueuil](http://open.canada.ca/data/en/dataset/77bd1809-a6da-4760-9e65-fd7c2d643cd2)
- **Carte permis** (exploration) : [Longueuil permis en ligne / cartes](https://longueuil.quebec/fr/cartes-interactives/carte-historique-permis)

## Import manuel (projet)

1. Exporter un CSV (colonnes min. `immeuble`, `latitude`, `longitude`).
2. Deposer dans [`in/manual/`](../in/manual/).
3. Option : [`in/manual/columns.json`](../in/manual/columns.json) pour mapper les noms de colonnes.
4. Lancer `npm run agents:ingest:manual` puis le pipeline (voir `agents/README.md`).
