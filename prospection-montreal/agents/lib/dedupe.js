function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || Number.isNaN(Number(v)))) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isLikelyExisting(candidate, inventory, options = {}) {
  const thresholdM = options.distanceMeters ?? 120;
  const candidateName = normalizeName(candidate.immeuble);
  return inventory.some((item) => {
    if (normalizeName(item.immeuble) === candidateName) return true;
    const distance = haversineMeters(
      candidate.latitude,
      candidate.longitude,
      item.latitude,
      item.longitude
    );
    return distance <= thresholdM;
  });
}

module.exports = { normalizeName, haversineMeters, isLikelyExisting };
