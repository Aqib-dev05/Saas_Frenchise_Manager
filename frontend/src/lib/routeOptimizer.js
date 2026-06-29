// Haversine distance in km between two lat/lng points
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Orders a list of points by nearest-neighbor heuristic starting from (startLat, startLng).
 * This is a greedy approximation of the Traveling Salesman Problem — not globally optimal,
 * but gives a sensible "visit nearest unvisited shop next" route for a handful of daily stops.
 *
 * @param {number} startLat
 * @param {number} startLng
 * @param {Array<{lat:number, lng:number}>} points - must include lat/lng on each item
 * @returns {Array} the same items, reordered
 */
export function nearestNeighborRoute(startLat, startLng, points) {
  const remaining = [...points]
  const ordered = []
  let curLat = startLat
  let curLng = startLng

  while (remaining.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceKm(curLat, curLng, remaining[i].lat, remaining[i].lng)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0]
    ordered.push({ ...next, distanceFromPrevKm: nearestDist })
    curLat = next.lat
    curLng = next.lng
  }

  return ordered
}
