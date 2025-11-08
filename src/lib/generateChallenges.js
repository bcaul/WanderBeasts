/**
 * Utility to generate challenges near parks using Overpass API
 * This can be called from the frontend to create challenges at detected park locations
 */

import { getNearbyParks } from './overpass.js'
import { supabase } from './supabase.js'

/**
 * Generate challenges near parks for a given location
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radiusMeters - Search radius (default 5000)
 * @returns {Promise<number>} Number of challenges created
 */
export async function generateChallengesNearParks(latitude, longitude, radiusMeters = 5000) {
  try {
    // Fetch nearby parks using Overpass API
    const parks = await getNearbyParks(latitude, longitude, radiusMeters)
    
    if (!parks || parks.length === 0) {
      console.log('No parks found nearby')
      return 0
    }

    console.log(`Found ${parks.length} parks nearby`)

    let challengesCreated = 0
    const { data: { user } } = await supabase.auth.getUser()

    // Get all creature types for creating collect challenges
    const { data: creatureTypes } = await supabase
      .from('creature_types')
      .select('id, name, rarity')
      .order('rarity')

    if (!creatureTypes || creatureTypes.length === 0) {
      console.error('No creature types found')
      return 0
    }

    // Create challenges for each park
    for (const park of parks) {
      if (!park.latitude || !park.longitude) continue

      try {
        // Create a collect challenge for a common creature (use first common creature)
        const commonCreature = creatureTypes.find(ct => ct.rarity === 'common')
        if (commonCreature) {
          const { data, error } = await supabase.rpc('create_challenge_near_park', {
            p_park_name: park.name,
            p_park_lat: park.latitude,
            p_park_lon: park.longitude,
            p_challenge_type: 'collect',
            p_creature_type_name: commonCreature.name,
            p_target_value: 3,
            p_radius_meters: 500,
          })

          if (!error && data) {
            challengesCreated++
            console.log(`Created challenge at ${park.name}`)
          } else if (error) {
            console.error(`Error creating challenge at ${park.name}:`, error)
          }
        }

        // Create a walk challenge (only for larger parks to avoid duplicates)
        if (park.name.length > 5) {
          const { data: walkData, error: walkError } = await supabase.rpc('create_challenge_near_park', {
            p_park_name: park.name + ' Walk',
            p_park_lat: park.latitude,
            p_park_lon: park.longitude,
            p_challenge_type: 'walk',
            p_creature_type_name: null,
            p_target_value: 1000,
            p_radius_meters: 1000,
          })

          if (!walkError && walkData) {
            challengesCreated++
          }
        }

        // For larger parks, create additional challenges
        if (park.name.length > 10) {
          // Create a rare creature challenge
          const rareCreature = creatureTypes.find(ct => ct.rarity === 'rare' || ct.rarity === 'uncommon')
          if (rareCreature) {
            await supabase.rpc('create_challenge_near_park', {
              p_park_name: park.name,
              p_park_lat: park.latitude,
              p_park_lon: park.longitude,
              p_challenge_type: 'collect',
              p_creature_type_name: rareCreature.name,
              p_target_value: 2,
              p_radius_meters: 800,
            })
          }
        }
      } catch (error) {
        console.error(`Error creating challenge for park ${park.name}:`, error)
      }
    }

    console.log(`Created ${challengesCreated} challenges near parks`)
    return challengesCreated
  } catch (error) {
    console.error('Error generating challenges near parks:', error)
    return 0
  }
}

/**
 * Generate challenges at a specific location (useful for testing)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} count - Number of challenges to create (default 5)
 */
export async function generateChallengesAtLocation(latitude, longitude, count = 5) {
  try {
    const { data: creatureTypes } = await supabase
      .from('creature_types')
      .select('id, name, rarity')
      .limit(10)

    if (!creatureTypes || creatureTypes.length === 0) {
      console.error('No creature types found')
      return 0
    }

    let created = 0
    const challengeTypes = ['collect', 'walk']
    const commonCreatures = creatureTypes.filter(ct => ct.rarity === 'common').slice(0, 4)

    // Create a challenge at the exact player location first
    try {
      const firstCommon = commonCreatures[0]
      if (firstCommon) {
        const { data: challengeId, error: error1 } = await supabase.rpc('create_challenge_at_location', {
          p_lat: latitude,
          p_lon: longitude,
          p_challenge_name: 'Welcome Challenge - Catch Nearby Creatures',
          p_challenge_type: 'collect',
          p_creature_type_name: firstCommon.name,
          p_target_value: 3,
          p_radius_meters: 500,
        })

        if (!error1 && challengeId) {
          created++
          console.log('Created welcome challenge at player location')
        }
      }
    } catch (error) {
      console.error('Error creating welcome challenge:', error)
    }

    // Create additional challenges around the location
    for (let i = 0; i < Math.min(count - 1, 4); i++) {
      // Add some random offset to spread challenges (within 2km)
      const offsetLat = latitude + (Math.random() - 0.5) * 0.018 // ~2km
      const offsetLon = longitude + (Math.random() - 0.5) * 0.018

      const challengeType = challengeTypes[i % challengeTypes.length]
      const creatureType = commonCreatures[i % commonCreatures.length]
      const parkName = `Local Area ${i + 1}`

      if (challengeType === 'collect' && creatureType) {
        const { data, error } = await supabase.rpc('create_challenge_near_park', {
          p_park_name: parkName,
          p_park_lat: offsetLat,
          p_park_lon: offsetLon,
          p_challenge_type: 'collect',
          p_creature_type_name: creatureType.name,
          p_target_value: 3 + (i % 2),
          p_radius_meters: 500,
        })

        if (!error && data) {
          created++
        }
      } else if (challengeType === 'walk') {
        const { data, error } = await supabase.rpc('create_challenge_near_park', {
          p_park_name: parkName,
          p_park_lat: offsetLat,
          p_park_lon: offsetLon,
          p_challenge_type: 'walk',
          p_creature_type_name: null,
          p_target_value: 500 + (i * 200),
          p_radius_meters: 800,
        })

        if (!error && data) {
          created++
        }
      }
    }

    return created
  } catch (error) {
    console.error('Error generating challenges at location:', error)
    return 0
  }
}

