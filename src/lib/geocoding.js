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

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=country&limit=1`
    )

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
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

  try {
    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      console.warn('Invalid coordinates for geocoding:', { latitude, longitude })
      return {}
    }

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,country&limit=5`
    )

    if (!response.ok) {
      // 422 usually means invalid coordinates format or out of range
      if (response.status === 422) {
        console.warn('Geocoding API returned 422 - invalid coordinates or format')
        return {}
      }
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()
    const features = data.features || []

    let city = null
    let country = null
    let countryCode = null

    for (const feature of features) {
      const placeType = feature.place_type?.[0]
      const properties = feature.properties || {}

      if (placeType === 'place' && !city) {
        city = properties.name || feature.text
      }

      if (placeType === 'country') {
        country = properties.name || feature.text
        countryCode = properties.short_code?.toUpperCase()
        break
      }
    }

    return {
      city: city || null,
      country: country || null,
      countryCode: countryCode || null,
    }
  } catch (error) {
    console.error('Error getting location details:', error)
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

