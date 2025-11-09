/**
 * Challenge Progress Tracking
 * Tracks user progress for different challenge types
 */

import { supabase } from './supabase.js'
import { calculateDistance, isValidCoordinate } from './geolocation.js'

/**
 * Update walking challenge progress
 * Tracks distance traveled and updates challenge progress when user is within challenge area
 * @param {string} userId - User ID
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @param {number} distanceMeters - Distance traveled since last update (in meters)
 */
export async function updateWalkingChallengeProgress(userId, latitude, longitude, distanceMeters) {
  try {
    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      console.warn('Invalid coordinates for walking challenge update')
      return
    }

    // Get user's active challenges (both walking and all types for potential future use)
    const { data: userChallenges, error } = await supabase
      .from('user_challenges')
      .select(`
        *,
        challenges (id, challenge_type, location, radius_meters, target_value)
      `)
      .eq('user_id', userId)
      .eq('completed', false)

    if (error) {
      console.error('Error fetching user challenges:', error)
      return
    }

    if (!userChallenges || userChallenges.length === 0) {
      return // No active challenges
    }

    // Filter for walking challenges and check if user is within challenge area
    const walkingChallenges = userChallenges.filter(
      uc => uc.challenges && uc.challenges.challenge_type === 'walk'
    )

    if (walkingChallenges.length === 0) {
      return // No walking challenges
    }

    // Update progress for each walking challenge where user is within radius
    for (const userChallenge of walkingChallenges) {
      const challenge = userChallenge.challenges
      if (!challenge || !challenge.location) continue

      // Parse challenge location
      const challengeCoords = parseChallengeLocation(challenge.location)
      if (!challengeCoords || !isValidCoordinate(challengeCoords.lat, challengeCoords.lon)) {
        continue
      }

      // Calculate distance to challenge location
      const distanceToChallenge = calculateDistance(
        latitude,
        longitude,
        challengeCoords.lat,
        challengeCoords.lon
      )

      // If within challenge radius, add distance to progress
      if (distanceToChallenge <= challenge.radius_meters) {
        // Round distance to avoid fractional meters
        const distanceToAdd = Math.round(distanceMeters)
        
        if (distanceToAdd > 0) {
          const { error: updateError } = await supabase.rpc('update_challenge_progress', {
            p_user_id: userId,
            p_challenge_id: challenge.id,
            p_progress_increment: distanceToAdd,
          })

          if (updateError) {
            console.error(`Error updating challenge ${challenge.id}:`, updateError)
          } else {
            console.log(`Updated walking challenge ${challenge.id}: +${distanceToAdd}m`)
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating walking challenge progress:', error)
  }
}

/**
 * Parse challenge location from various formats
 * Handles GeoJSON, WKT, and other formats
 */
function parseChallengeLocation(location) {
  if (!location) return null

  // Handle GeoJSON format (most common from PostGIS)
  if (typeof location === 'object') {
    if (location.coordinates && Array.isArray(location.coordinates)) {
      return { 
        lon: parseFloat(location.coordinates[0]), 
        lat: parseFloat(location.coordinates[1]) 
      }
    }
    
    // Handle direct lat/lon properties
    if (location.latitude !== undefined && location.longitude !== undefined) {
      return { 
        lat: parseFloat(location.latitude), 
        lon: parseFloat(location.longitude) 
      }
    }
    
    // Handle lat/lng properties
    if (location.lat !== undefined && location.lng !== undefined) {
      return { 
        lat: parseFloat(location.lat), 
        lon: parseFloat(location.lng) 
      }
    }
  }

  // Handle WKT string format (POINT(longitude latitude))
  if (typeof location === 'string') {
    // Try GeoJSON-like string first
    if (location.includes('coordinates')) {
      try {
        const parsed = JSON.parse(location)
        if (parsed.coordinates) {
          return { 
            lon: parseFloat(parsed.coordinates[0]), 
            lat: parseFloat(parsed.coordinates[1]) 
          }
        }
      } catch (e) {
        // Not JSON, continue
      }
    }
    
    // Try WKT format: POINT(lon lat)
    const match = location.match(/POINT\(([^)]+)\)/)
    if (match) {
      const coords = match[1].trim().split(/\s+/)
      if (coords.length >= 2) {
        return { 
          lon: parseFloat(coords[0]), 
          lat: parseFloat(coords[1]) 
        }
      }
    }
    
    // Try simple coordinate string: "lon,lat" or "lat,lon"
    const commaMatch = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
    if (commaMatch) {
      const val1 = parseFloat(commaMatch[1])
      const val2 = parseFloat(commaMatch[2])
      // Determine order by value range (lon is typically -180 to 180, lat is -90 to 90)
      if (Math.abs(val1) <= 180 && Math.abs(val2) <= 90) {
        return { lon: val1, lat: val2 }
      } else if (Math.abs(val1) <= 90 && Math.abs(val2) <= 180) {
        return { lat: val1, lon: val2 }
      }
    }
  }

  return null
}

