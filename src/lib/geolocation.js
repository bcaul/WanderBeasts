/**
 * Geolocation utilities for getting user location and calculating distances
 */

/**
 * Get current user location using browser Geolocation API
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Don't use cached position
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        let errorMessage = 'Unable to get your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
        }
        reject(new Error(errorMessage))
      },
      options
    )
  })
}

/**
 * Watch user location with callbacks
 * @param {Function} onSuccess - Callback with position
 * @param {Function} onError - Callback with error
 * @returns {number} Watch ID for clearing
 */
export function watchLocation(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported'))
    return null
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000, // Use cached position if < 5 seconds old
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
      })
    },
    (error) => {
      let errorMessage = 'Unable to get your location'
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location unavailable'
          break
        case error.TIMEOUT:
          errorMessage = 'Location request timed out'
          break
      }
      onError(new Error(errorMessage))
    },
    options
  )
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

/**
 * Check if user is within catch range (50 meters)
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {number} targetLat - Target latitude
 * @param {number} targetLon - Target longitude
 * @param {number} rangeMeters - Catch range in meters (default 50)
 * @returns {boolean}
 */
export function isWithinRange(userLat, userLon, targetLat, targetLon, rangeMeters = 50) {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon)
  return distance <= rangeMeters
}

/**
 * Validate if coordinates are valid
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean}
 */
export function isValidCoordinate(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return false
  }
  if (isNaN(lat) || isNaN(lon)) {
    return false
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return false
  }
  return true
}

