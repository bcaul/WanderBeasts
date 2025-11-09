/**
 * Gym spawning system for epic and legendary creatures
 * Spawns creatures at gyms when 5+ players are present
 */

import { supabase } from './supabase.js'
import { calculateDistance } from './geolocation.js'

/**
 * Update player location at a gym
 * This tracks players near gym locations for spawning epic/legendary creatures
 * @param {string} gymId - Gym UUID
 * @param {string} userId - User UUID
 * @param {number} latitude - Player latitude
 * @param {number} longitude - Player longitude
 */
export async function updatePlayerGymLocation(gymId, userId, latitude, longitude) {
  try {
    const { error } = await supabase.rpc('update_player_gym_location', {
      p_gym_id: gymId,
      p_user_id: userId,
      p_latitude: latitude,
      p_longitude: longitude
    })

    if (error) {
      console.error('Error updating player gym location:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to update player gym location:', error)
  }
}

/**
 * Get players near a gym
 * @param {string} gymId - Gym UUID
 * @param {number} radiusMeters - Radius in meters (default 100)
 * @returns {Promise<Array>} Array of players with username and distance
 */
export async function getPlayersNearGym(gymId, radiusMeters = 100) {
  try {
    const { data, error } = await supabase.rpc('get_players_near_gym', {
      p_gym_id: gymId,
      radius_meters: radiusMeters
    })

    if (error) {
      console.error('Error getting players near gym:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to get players near gym:', error)
    return []
  }
}

/**
 * Count players at a gym
 * @param {string} gymId - Gym UUID
 * @param {number} radiusMeters - Radius in meters (default 100)
 * @returns {Promise<number>} Number of players
 */
export async function countPlayersAtGym(gymId, radiusMeters = 100) {
  try {
    const { data, error } = await supabase.rpc('count_players_at_gym', {
      p_gym_id: gymId,
      radius_meters: radiusMeters
    })

    if (error) {
      console.error('Error counting players at gym:', error)
      return 0
    }

    return data || 0
  } catch (error) {
    console.error('Failed to count players at gym:', error)
    return 0
  }
}

/**
 * Check and spawn creatures at gyms with 5+ players
 * This should be called periodically (e.g., every minute)
 * @returns {Promise<Array>} Array of gyms where spawns were created
 */
export async function checkAndSpawnGymCreatures() {
  try {
    const { data, error } = await supabase.rpc('check_and_spawn_gym_creatures')

    if (error) {
      console.error('Error checking and spawning gym creatures:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to check and spawn gym creatures:', error)
    return []
  }
}

/**
 * Track player locations at nearby gyms
 * Call this when player location changes to update gym tracking
 * @param {string} userId - User UUID
 * @param {number} latitude - Player latitude
 * @param {number} longitude - Player longitude
 * @param {Array} gyms - Array of gym objects with id, latitude, longitude
 * @param {number} gymRadiusMeters - Radius to consider player "at gym" (default 100m)
 */
export async function trackPlayerAtGyms(userId, latitude, longitude, gyms, gymRadiusMeters = 100) {
  if (!gyms || gyms.length === 0) {
    return
  }

  // Check which gyms the player is near
  const nearbyGyms = gyms.filter(gym => {
    if (!gym.latitude || !gym.longitude) return false
    const distance = calculateDistance(latitude, longitude, gym.latitude, gym.longitude)
    return distance <= gymRadiusMeters
  })

  // Update player location for each nearby gym
  for (const gym of nearbyGyms) {
    try {
      await updatePlayerGymLocation(gym.id, userId, latitude, longitude)
    } catch (error) {
      console.error(`Failed to update location for gym ${gym.id}:`, error)
    }
  }
}

/**
 * Get active spawns at a gym (epic/legendary creatures)
 * @param {string} gymId - Gym UUID
 * @returns {Promise<Array>} Array of spawns with creature_types
 */
export async function getGymSpawns(gymId) {
  try {
    const { data, error } = await supabase
      .from('spawns')
      .select(`
        *,
        creature_types (*)
      `)
      .eq('gym_id', gymId)
      .gt('expires_at', new Date().toISOString())
      .order('spawned_at', { ascending: false })

    if (error) {
      console.error('Error getting gym spawns:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to get gym spawns:', error)
    return []
  }
}

/**
 * Get RSVPs for a gym with user profiles
 * @param {string} gymId - Gym UUID
 * @returns {Promise<Array>} Array of RSVPs with user profiles
 */
export async function getGymRSVPs(gymId) {
  try {
    // First get RSVPs
    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select('*')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false })

    if (rsvpError) {
      console.error('Error getting gym RSVPs:', rsvpError)
      return []
    }

    if (!rsvps || rsvps.length === 0) {
      return []
    }

    // Get user profiles for each RSVP
    const userIds = rsvps.map(r => r.user_id)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)

    if (profileError) {
      console.error('Error getting profiles:', profileError)
      // Return RSVPs without profiles
      return rsvps.map(rsvp => ({ ...rsvp, profiles: null }))
    }

    // Combine RSVPs with profiles
    const profilesMap = new Map((profiles || []).map(p => [p.id, p]))
    return rsvps.map(rsvp => ({
      ...rsvp,
      profiles: profilesMap.get(rsvp.user_id) || null
    }))
  } catch (error) {
    console.error('Failed to get gym RSVPs:', error)
    return []
  }
}

