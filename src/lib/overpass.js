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
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Check if in park with caching
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<{inPark: boolean, parkName?: string}>}
 */
export async function checkIfInParkCached(latitude, longitude) {
  // Round coordinates to ~100m precision for caching
  const cacheKey = `${Math.round(latitude * 1000) / 1000}_${Math.round(longitude * 1000) / 1000}`
  const cached = parkCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }

  const result = await checkIfInPark(latitude, longitude)
  parkCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  })

  return result
}

