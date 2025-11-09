/**
 * Reverse geocoding utilities using Mapbox Geocoding API
 */

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

/**
 * Reverse geocode coordinates to get country code
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string|null>} Country code (ISO 3166-1 alpha-2) or null
 */
export async function getCountryCode(latitude, longitude) {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn('Mapbox token not available for reverse geocoding')
    return null
  }

  // Validate coordinates before making API call
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
      isNaN(latitude) || isNaN(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180) {
    console.warn('Invalid coordinates for country code lookup:', { latitude, longitude })
    return null
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=country&limit=1`
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`Geocoding API error: ${response.status}`, errorText)
      // Return null instead of throwing to prevent app crashes
      return null
    }

    const data = await response.json()
    const features = data.features || []

    if (features.length > 0) {
      // Extract country code from feature properties
      const countryCode = features[0].properties?.short_code?.toUpperCase()
      return countryCode || null
    }

    return null
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

/**
 * Get location details (city, country, etc.)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<{city?: string, country?: string, countryCode?: string}>}
 */
export async function getLocationDetails(latitude, longitude) {
  if (!MAPBOX_ACCESS_TOKEN) {
    return {}
  }

  // Validate coordinates before making API call
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
      isNaN(latitude) || isNaN(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180) {
    console.warn('Invalid coordinates for geocoding:', { latitude, longitude })
    return {}
  }

  try {
    // Mapbox requires separate calls when using limit with multiple types
    // Make two calls: one for place, one for country
    const [placeResponse, countryResponse] = await Promise.all([
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place&limit=1`
      ),
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=country&limit=1`
      )
    ])

    let city = null
    let country = null
    let countryCode = null

    // Parse place response
    if (placeResponse.ok) {
      const placeData = await placeResponse.json()
      const placeFeatures = placeData.features || []
      if (placeFeatures.length > 0) {
        const properties = placeFeatures[0].properties || {}
        city = properties.name || placeFeatures[0].text
      }
    } else {
      const errorText = await placeResponse.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.warn(`Geocoding API error (place): ${placeResponse.status}`, errorText)
      }
    }

    // Parse country response
    if (countryResponse.ok) {
      const countryData = await countryResponse.json()
      const countryFeatures = countryData.features || []
      if (countryFeatures.length > 0) {
        const properties = countryFeatures[0].properties || {}
        country = properties.name || countryFeatures[0].text
        countryCode = properties.short_code?.toUpperCase()
      }
    } else {
      const errorText = await countryResponse.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.warn(`Geocoding API error (country): ${countryResponse.status}`, errorText)
      }
    }

    return {
      city: city || null,
      country: country || null,
      countryCode: countryCode || null,
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error getting location details:', error)
    }
    return {}
  }
}

/**
 * Cache for country codes (to avoid excessive API calls)
 */
const countryCodeCache = new Map()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour (countries don't change)

/**
 * Get country code with caching
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string|null>}
 */
export async function getCountryCodeCached(latitude, longitude) {
  // Round coordinates to ~10km precision for caching
  const cacheKey = `${Math.round(latitude * 100) / 100}_${Math.round(longitude * 100) / 100}`
  const cached = countryCodeCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.countryCode
  }

  const countryCode = await getCountryCode(latitude, longitude)
  if (countryCode) {
    countryCodeCache.set(cacheKey, {
      countryCode,
      timestamp: Date.now(),
    })
  }

  return countryCode
}

