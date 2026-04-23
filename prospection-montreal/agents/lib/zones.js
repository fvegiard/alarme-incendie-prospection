/**
 * Zones grossieres (bbox) + inference pour alignement dashboard.
 * A affiner si tu branches des limites admin precises (GeoJSON).
 */

const BBOX = {
  montreal_core: { minLat: 45.42, maxLat: 45.6, minLon: -73.8, maxLon: -73.45 },
  laval: { minLat: 45.52, maxLat: 45.68, minLon: -73.9, maxLon: -73.6 },
  longueuil_brossard: { minLat: 45.4, maxLat: 45.55, minLon: -73.6, maxLon: -73.4 },
};

function inBbox(lat, lon, b) {
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
}

/**
 * @returns {{ zone: string, zone_lettre: string }}
 */
function inferZone(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return { zone: "Inconnu - coordonnees", zone_lettre: "?" };
  }
  if (inBbox(lat, lon, BBOX.laval)) {
    return { zone: "Laval - A valider", zone_lettre: "L" };
  }
  if (inBbox(lat, lon, BBOX.longueuil_brossard)) {
    if (lat < 45.5 && lon > -73.52) {
      return { zone: "Brossard - Taschereau", zone_lettre: "S" };
    }
    return { zone: "Longueuil - Metro", zone_lettre: "S" };
  }
  if (inBbox(lat, lon, BBOX.montreal_core)) {
    return { zone: "Montreal - A valider", zone_lettre: "M" };
  }
  return { zone: "Hors perimetre - A valider", zone_lettre: "?" };
}

module.exports = { inferZone, BBOX };
