function getScoreAnciennete(annee) {
  if (!annee || Number.isNaN(Number(annee))) return 2;
  if (annee < 1980) return 5;
  if (annee < 1990) return 4;
  if (annee < 2000) return 3;
  if (annee <= 2010) return 2;
  return 1;
}

function getScoreUsage(usage) {
  const value = String(usage || "").toLowerCase();
  if (value.includes("hospital") || value.includes("institution") || value.includes("industrial")) return 5;
  if (value.includes("office") || value.includes("mix")) return 3;
  return 1;
}

function getScoreHauteur(etages) {
  const floors = Number(etages || 0);
  if (floors > 25) return 3;
  if (floors >= 15) return 2;
  return 1;
}

function getPriorite(scoreTotal) {
  if (scoreTotal >= 10) return "Très élevée";
  if (scoreTotal >= 8) return "Élevée";
  if (scoreTotal >= 5) return "Moyenne";
  return "Faible";
}

function getStatutPublic(annee) {
  if (!annee) return "Validation requise";
  if (annee <= 1999) return "1999 et antérieur – audit prioritaire";
  if (annee <= 2016) return "2000-2016 – aucune preuve publique trouvée";
  if (annee <= 2023) return "Récent 2017-2023 – à valider";
  return "Neuf 2024-2025 – faible probabilité d’écart public";
}

function getSegment(usage) {
  const value = String(usage || "").toLowerCase();
  if (value.includes("residential") || value.includes("condo")) {
    return "Syndicat / condo";
  }
  return "Commercial / institutionnel";
}

function normalizeBuildingRecord(raw) {
  const annee = raw.annee ? Number(raw.annee) : null;
  const etages = raw.etages ? Number(raw.etages) : null;

  const scoreAnciennete = getScoreAnciennete(annee);
  const scoreUsage = getScoreUsage(raw.usage);
  const scoreHauteur = getScoreHauteur(etages);
  const scoreTotal = scoreAnciennete + scoreUsage + scoreHauteur;

  return {
    ...raw,
    annee,
    etages,
    age_2026: annee ? 2026 - annee : null,
    score_anciennete: scoreAnciennete,
    score_usage: scoreUsage,
    score_hauteur: scoreHauteur,
    score_total: scoreTotal,
    priorite: getPriorite(scoreTotal),
    statut_public: getStatutPublic(annee),
    segment: getSegment(raw.usage),
  };
}

module.exports = {
  normalizeBuildingRecord,
};
