/**
 * OpenStreetMap Overpass API integration for park detection
 */

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

/**
 * Check if a location is within a park using OpenStreetMap data
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} radiusMeters - Search radius in meters (default 1000)
 * @returns {Promise<{inPark: boolean, parkName?: string}>}
 */
export async function checkIfInPark(latitude, longitude, radiusMeters = 1000) {
  try {
    // Overpass QL query for parks
    const query = `
      [out:json][timeout:10];
      (
        node["leisure"="park"](around:${radiusMeters},${latitude},${longitude});
        way["leisure"="park"](around:${radiusMeters},${latitude},${longitude});
        node["boundary"="national_park"](around:${radiusMeters},${latitude},${longitude});
        way["boundary"="national_park"](around:${radiusMeters},${latitude},${longitude});
        node["leisure"="nature_reserve"](around:${radiusMeters},${latitude},${longitude});
        way["leisure"="nature_reserve"](around:${radiusMeters},${latitude},${longitude});
        node["landuse"="recreation_ground"](around:${radiusMeters},${latitude},${longitude});
        way["landuse"="recreation_ground"](around:${radiusMeters},${latitude},${longitude});
      );
      out center;
    `

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`)
    }

    const data = await response.json()
    const elements = data.elements || []

    if (elements.length > 0) {
      // Get the closest park name
      const park = elements[0]
      const parkName = park.tags?.name || park.tags?.['name:en'] || 'Park'

      return {
        inPark: true,
        parkName,
      }
    }

    return {
      inPark: false,
    }
  } catch (error) {
    console.error('Error checking park status:', error)
    // Fail gracefully - assume not in park
    return {
      inPark: false,
    }
  }
}

/**
 * Get nearby parks for a location
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} radiusMeters - Search radius (default 2000)
 * @returns {Promise<Array>} Array of park objects with name and location
 */
export async function getNearbyParks(latitude, longitude, radiusMeters = 2000) {
  try {
    const query = `
      [out:json][timeout:15];
      (
        node["leisure"="park"](around:${radiusMeters},${latitude},${longitude});
        way["leisure"="park"](around:${radiusMeters},${latitude},${longitude});
        node["boundary"="national_park"](around:${radiusMeters},${latitude},${longitude});
        way["boundary"="national_park"](around:${radiusMeters},${latitude},${longitude});
      );
      out center;
    `

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`)
    }

    const data = await response.json()
    const elements = data.elements || []

    return elements
      .map(element => ({
        id: element.id,
        name: element.tags?.name || element.tags?.['name:en'] || 'Unnamed Park',
        latitude: element.lat || element.center?.lat,
        longitude: element.lon || element.center?.lon,
        type: element.tags?.leisure || element.tags?.boundary || 'park',
      }))
      .filter(park => park.latitude && park.longitude)
  } catch (error) {
    console.error('Error fetching nearby parks:', error)
    return []
  }
}

/**
 * Cache for park checks (to avoid excessive API calls)
 */
const parkCache = new Map()

/**
 * Check if in park with caching
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<{inPark: boolean, parkName?: string}>}
 */
export async function checkIfInParkCached(latitude, longitude) {
  // Use more precise coordinates for cache key (6 decimal places = ~0.1m precision)
  // This ensures cache is location-specific and prevents false positives
  const cacheKey = `${latitude.toFixed(6)}_${longitude.toFixed(6)}`
  const cached = parkCache.get(cacheKey)

  // Reduce cache TTL to 10 seconds to prevent stale location data
  // This ensures if user moves, they get updated park status quickly
  if (cached && Date.now() - cached.timestamp < 10000) {
    return cached.result
  }

  // Clear old cache entries periodically to prevent memory leaks
  if (parkCache.size > 100) {
    const now = Date.now()
    for (const [key, value] of parkCache.entries()) {
      if (now - value.timestamp > 60000) { // Remove entries older than 1 minute
        parkCache.delete(key)
      }
    }
  }

  // Use VERY small radius (15m) to only detect parks you're actually IN
  // This prevents false positives when you're near but not in a park
  // Previous radius of 50m was too large and caused incorrect park detection
  const result = await checkIfInPark(latitude, longitude, 15)
  parkCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  })

  return result
}

