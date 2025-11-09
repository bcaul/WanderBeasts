/**
 * Creature spawning algorithm and utilities
 */

import { supabase } from './supabase.js'

/**
 * Spawn chance based on rarity
 */
const RARITY_WEIGHTS = {
  common: 0.60,
  uncommon: 0.25,
  rare: 0.10,
  epic: 0.04,
  legendary: 0.01,
}

/**
 * Generate spawns in a grid around user location
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @param {number} radiusMeters - Spawn radius in meters (default 500)
 * @param {boolean} inPark - Whether location is in a park (boosts spawns)
 * @param {string} countryCode - User's country code for region locking
 */
export async function generateSpawns(latitude, longitude, radiusMeters = 500, inPark = false, countryCode = null) {
  try {
    // Get available creature types (region filtering)
    let creatureTypes
    let typesError
    
    if (countryCode) {
      // Filter: either not region locked OR country is in allowed list
      // First get non-region-locked creatures
      const { data: globalCreatures, error: globalError } = await supabase
        .from('creature_types')
        .select('*')
        .eq('region_locked', false)
      
      // Then get region-locked creatures for this country
      // Check if countryCode is in the allowed_countries array
      const { data: allRegionalCreatures, error: regionalError } = await supabase
        .from('creature_types')
        .select('*')
        .eq('region_locked', true)
      
      // Filter client-side for array contains (Supabase array overlap)
      const regionalCreatures = allRegionalCreatures?.filter(creature => 
        creature.allowed_countries && 
        Array.isArray(creature.allowed_countries) &&
        creature.allowed_countries.includes(countryCode)
      ) || []
      
      if (globalError || regionalError) {
        typesError = globalError || regionalError
        creatureTypes = []
      } else {
        // Combine and deduplicate
        const allCreatures = [...(globalCreatures || []), ...(regionalCreatures || [])]
        creatureTypes = allCreatures.filter((creature, index, self) =>
          index === self.findIndex(c => c.id === creature.id)
        )
      }
    } else {
      // If no country code, only show non-region-locked creatures
      const result = await supabase
        .from('creature_types')
        .select('*')
        .eq('region_locked', false)
      creatureTypes = result.data
      typesError = result.error
    }

    if (typesError) throw typesError
    if (!creatureTypes || creatureTypes.length === 0) {
      console.warn('No creature types available for spawning')
      return
    }

    // Generate spawns in a smaller radius around user (200m instead of 500m)
    // This ensures spawns are close enough to catch (within 100m catch range)
    const spawnRadius = Math.min(radiusMeters, 200) // Cap at 200m for better catchability
    const gridSpacing = 50 // Smaller spacing for more spawns closer to user
    const gridSize = Math.ceil((spawnRadius * 2) / gridSpacing)
    const spawns = []

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // Calculate grid point offset (in meters, then convert to degrees)
        const offsetMetersLat = (i - gridSize / 2) * gridSpacing
        const offsetMetersLon = (j - gridSize / 2) * gridSpacing
        
        // Convert meters to degrees (approximately)
        const offsetLat = offsetMetersLat / 111320 // ~111km per degree latitude
        const offsetLon = offsetMetersLon / (111320 * Math.cos(latitude * Math.PI / 180))

        const spawnLat = latitude + offsetLat
        const spawnLon = longitude + offsetLon

        // Calculate distance from user to spawn point
        const distanceFromUser = Math.sqrt(offsetMetersLat ** 2 + offsetMetersLon ** 2)
        
        // Minimum distance: 25 meters (prevent spawns on/too close to player icon)
        const MIN_SPAWN_DISTANCE = 25
        // Maximum distance: 150 meters (to ensure catchability within 100m range)
        const MAX_SPAWN_DISTANCE = 150
        
        // Skip if too close to player or too far away
        if (distanceFromUser < MIN_SPAWN_DISTANCE || distanceFromUser > MAX_SPAWN_DISTANCE) {
          continue
        }

        // Random spawn chance (25% base chance per cell)
        let spawnChance = 0.25

        // Park boost (2-3x multiplier)
        if (inPark) {
          spawnChance *= 2.5
        }

        if (Math.random() < spawnChance) {
          // Select creature type based on rarity
          const creature = selectCreatureByRarity(creatureTypes, inPark)
          if (creature) {
            spawns.push({
              creature_type_id: creature.id,
              location: `POINT(${spawnLon} ${spawnLat})`,
              in_park: inPark,
            })
          }
        }
      }
    }
    

    // Insert spawns into database (PostGIS geography)
    if (spawns.length > 0) {
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('User not authenticated. Cannot insert spawns.')
        throw new Error('User must be authenticated to generate spawns')
      }
      
      // Insert spawns - Supabase handles PostGIS geography conversion
      // Format: "POINT(longitude latitude)" or use raw coordinates
      const spawnsToInsert = spawns.map(spawn => {
        // Extract coordinates from POINT string for Supabase
        const locationMatch = spawn.location.match(/POINT\(([^)]+)\)/)
        let locationData = spawn.location // Default to POINT string
        
        if (locationMatch) {
          const [lon, lat] = locationMatch[1].trim().split(/\s+/)
          // Supabase can accept POINT string directly, or we can use raw format
          // Try using the POINT string format first
          locationData = `POINT(${lon} ${lat})`
        }
        
        return {
          creature_type_id: spawn.creature_type_id,
          location: locationData, // PostGIS POINT string format
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min TTL
          in_park: spawn.in_park || false,
        }
      })
      
      
      const { data, error: insertError } = await supabase
        .from('spawns')
        .insert(spawnsToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting spawns:', insertError)
        console.error('Error details:', JSON.stringify(insertError, null, 2))
        console.error('Error code:', insertError.code)
        console.error('Error message:', insertError.message)
        console.error('Error hint:', insertError.hint)
        
        // Check if it's an RLS error
        if (insertError.message?.includes('row-level security') || insertError.code === '42501') {
          throw new Error('RLS Policy Error: Cannot insert spawns. Please run the fix SQL: supabase/migrations/003_fix_spawns_insert_policy.sql')
        }
        
        throw insertError
      }
    } else {
      console.warn('No spawns generated. This might be due to low spawn chance or no creature types available.')
    }

    return spawns.length
  } catch (error) {
    console.error('Error generating spawns:', error)
    console.error('Error stack:', error.stack)
    throw error
  }
}

/**
 * Select creature by rarity with weights
 * @param {Array} creatureTypes - Available creature types
 * @param {boolean} parkBoost - Whether park boost is active
 * @returns {Object|null} Selected creature type
 */
function selectCreatureByRarity(creatureTypes, parkBoost = false) {
  // Adjust rarity weights for park boost (increase rare/epic/legendary chances)
  const weights = parkBoost
    ? {
        common: 0.50,
        uncommon: 0.25,
        rare: 0.15,
        epic: 0.07,
        legendary: 0.03,
      }
    : RARITY_WEIGHTS

  const random = Math.random()
  let cumulative = 0

  // Group creatures by rarity
  const byRarity = {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    legendary: [],
  }

  creatureTypes.forEach(creature => {
    if (byRarity[creature.rarity]) {
      byRarity[creature.rarity].push(creature)
    }
  })

  // Select rarity
  for (const [rarity, weight] of Object.entries(weights)) {
    cumulative += weight
    if (random <= cumulative && byRarity[rarity].length > 0) {
      // Random creature from selected rarity
      const creatures = byRarity[rarity]
      return creatures[Math.floor(Math.random() * creatures.length)]
    }
  }

  // Fallback to first available creature
  return creatureTypes.length > 0 ? creatureTypes[0] : null
}

/**
 * Get nearby spawns within radius
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @param {number} radiusMeters - Search radius (default 500)
 * @returns {Promise<Array>} Array of spawn objects with creature_types
 */
export async function getNearbySpawns(latitude, longitude, radiusMeters = 500) {
  try {
    // Try to use PostGIS RPC function first (more efficient)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_nearby_spawns', {
      user_lat: latitude,
      user_lon: longitude,
      radius_meters: radiusMeters,
    })

    if (!rpcError && rpcData && rpcData.length > 0) {
      // Fetch creature types for the spawns
      // Note: location will be in WKB hex format, which we'll parse
      const spawnIds = rpcData.map(s => s.id)
      const { data: spawnsWithCreatures, error: fetchError } = await supabase
        .from('spawns')
        .select(`
          *,
          creature_types (id, name, rarity, type, image_url, region_locked, allowed_countries, base_spawn_rate, park_boost_multiplier)
        `)
        .in('id', spawnIds)
        .gte('expires_at', new Date().toISOString())
        .is('gym_id', null) // Exclude gym spawns - they're shown on gym markers

      if (!fetchError && spawnsWithCreatures) {
        
        // Parse WKB hex locations to coordinates
        const parsedSpawns = spawnsWithCreatures.map(spawn => {
          // If coordinates are already extracted, use them
          if (spawn.longitude !== undefined && spawn.latitude !== undefined) {
            return spawn
          }
          
          // Otherwise, parse from location field (WKB hex)
          if (typeof spawn.location === 'string' && spawn.location.startsWith('0101')) {
            const coords = parseWKBHex(spawn.location)
            if (coords) {
              return {
                ...spawn,
                longitude: coords.lon,
                latitude: coords.lat,
              }
            }
          } else {
            // Try other formats
            const coords = parseLocationString(spawn.location)
            if (coords) {
              return {
                ...spawn,
                longitude: coords.lon,
                latitude: coords.lat,
              }
            }
          }
          return spawn
        })
        
        
        return parsedSpawns
      } else if (fetchError) {
        console.warn('Error fetching spawns with creature types:', fetchError)
      }
    } else if (rpcError) {
      console.log('RPC function not available or error:', rpcError.message)
    }

    // Fallback: Get all non-expired spawns and filter client-side
    // Use PostGIS functions to extract coordinates as numbers
    console.log('Using fallback method to fetch spawns (RPC function may not be available)')
    const { data: allSpawns, error: queryError } = await supabase
      .rpc('get_spawns_with_coords')
      .gte('expires_at', new Date().toISOString())
      .limit(100)
    
    // If RPC doesn't exist, fall back to regular query and parse WKB
    if (queryError && queryError.message?.includes('function') || !allSpawns) {
      console.log('RPC function not available, using direct query with WKB parsing')
      const { data: rawSpawns, error: directError } = await supabase
        .from('spawns')
        .select(`
          *,
          creature_types (id, name, rarity, type, image_url, region_locked, allowed_countries, base_spawn_rate, park_boost_multiplier)
        `)
        .gte('expires_at', new Date().toISOString())
        .is('gym_id', null) // Exclude gym spawns - they're shown on gym markers
        .limit(100)
      
      if (directError) {
        console.warn('Error fetching spawns:', directError)
        return []
      }
      
      // Parse WKB hex strings to coordinates
      if (rawSpawns && rawSpawns.length > 0) {
        const parsedSpawns = rawSpawns.map(spawn => {
          if (typeof spawn.location === 'string' && spawn.location.startsWith('0101')) {
            // This is WKB hex format - parse it
            const coords = parseWKBHex(spawn.location)
            if (coords) {
              return {
                ...spawn,
                longitude: coords.lon,
                latitude: coords.lat,
                location: `POINT(${coords.lon} ${coords.lat})`, // Convert to WKT for compatibility
              }
            } else {
              console.warn('Failed to parse WKB hex for spawn:', spawn.id, spawn.location.substring(0, 20))
            }
          } else {
            // Try parsing as WKT or other format
            const coords = parseLocationString(spawn.location)
            if (coords) {
              return {
                ...spawn,
                longitude: coords.lon,
                latitude: coords.lat,
              }
            }
          }
          return null
        }).filter(spawn => spawn !== null && spawn.longitude !== undefined && spawn.latitude !== undefined)
        
        
        // Filter by distance
        const nearbySpawns = parsedSpawns.filter(spawn => {
          const distance = calculateDistance(latitude, longitude, spawn.latitude, spawn.longitude)
          return distance <= radiusMeters
        })
        
        return nearbySpawns
      }
      return []
    }

    if (queryError) {
      console.warn('Error fetching spawns:', queryError)
      return []
    }

    if (!allSpawns || allSpawns.length === 0) {
      return []
    }

    // Filter by approximate distance (client-side fallback)
    // Parse location strings and calculate distance
    const nearbySpawns = allSpawns.filter(spawn => {
      if (!spawn.location) {
        console.warn('Spawn missing location:', spawn.id)
        return false
      }
      
      
      // Parse PostGIS point string
      const coords = parseLocationString(spawn.location)
      if (!coords || !coords.lon || !coords.lat) {
        console.warn('Failed to parse location:', spawn.location, 'Parsed:', coords)
        return false
      }
      
      const distance = calculateDistance(latitude, longitude, coords.lat, coords.lon)
      return distance <= radiusMeters
    })
    

    // Sort by distance (closest first)
    nearbySpawns.sort((a, b) => {
      const coordsA = parseLocationString(a.location)
      const coordsB = parseLocationString(b.location)
      if (!coordsA || !coordsB) return 0
      
      const distA = calculateDistance(latitude, longitude, coordsA.lat, coordsA.lon)
      const distB = calculateDistance(latitude, longitude, coordsB.lat, coordsB.lon)
      return distA - distB
    })

    return nearbySpawns.slice(0, 50) // Limit to 50 nearest spawns
  } catch (error) {
    console.error('Error fetching nearby spawns:', error)
    return []
  }
}

/**
 * Parse WKB hex string to coordinates (PostGIS geography format)
 * @param {string} hex - WKB hex string (e.g., "0101000020E61000005F28141DE50B02C04CC0A2F9F0B94A40")
 * @returns {{lon: number, lat: number}|null}
 */
function parseWKBHex(hex) {
  try {
    if (!hex || typeof hex !== 'string' || hex.length < 42) {
      return null
    }
    
    // WKB Extended format with SRID:
    // Byte 0: Endianness (01 means little endian)
    // Bytes 1-4: Geometry type (01000000 means Point with SRID)
    // Bytes 5-8: SRID (20E61000 means 4326 in little endian: 00 10 E6 20)
    // Bytes 9-16: X coordinate (longitude) as double
    // Bytes 17-24: Y coordinate (latitude) as double
    
    // Extract coordinate hex strings (16 chars each = 8 bytes)
    // Skip: 2 (endian) + 8 (type) + 8 (SRID) = 18 hex chars
    const xHex = hex.substring(18, 34) // Longitude (8 bytes)
    const yHex = hex.substring(34, 50) // Latitude (8 bytes)
    
    // Convert hex to bytes (little endian - read in reverse pairs)
    const lon = parseDoubleLittleEndian(xHex)
    const lat = parseDoubleLittleEndian(yHex)
    
    if (isNaN(lon) || isNaN(lat) || !isFinite(lon) || !isFinite(lat)) {
      console.warn('Invalid coordinates from WKB:', { lon, lat, xHex, yHex })
      return null
    }
    
    return { lon, lat }
  } catch (error) {
    console.error('Error parsing WKB hex:', error, hex)
    return null
  }
}

/**
 * Parse 16-character hex string as little-endian double (float64)
 * @param {string} hex - 16 hex characters (8 bytes)
 * @returns {number}
 */
function parseDoubleLittleEndian(hex) {
  // Create a buffer and view
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  
  // Convert hex pairs to bytes (in little endian order)
  for (let i = 0; i < 8; i++) {
    const byteValue = parseInt(hex.substr(i * 2, 2), 16)
    view.setUint8(i, byteValue)
  }
  
  // Read as Float64 (little endian = true)
  return view.getFloat64(0, true)
}

/**
 * Parse PostGIS location string to coordinates
 * @param {string|object} location - PostGIS point string, WKB hex, or object with coordinates
 * @returns {{lon: number, lat: number}|null}
 */
function parseLocationString(location) {
  // Handle WKB hex format (starts with "0101")
  if (typeof location === 'string' && location.startsWith('0101')) {
    return parseWKBHex(location)
  }
  
  // Handle WKT string format: "POINT(lon lat)" or "SRID=4326;POINT(lon lat)"
  if (typeof location === 'string') {
    const match = location.match(/POINT\(([^)]+)\)/)
    if (match) {
      const coords = match[1].trim().split(/\s+/)
      if (coords.length >= 2) {
        return {
          lon: parseFloat(coords[0]),
          lat: parseFloat(coords[1]),
        }
      }
    }
  }
  
  // Handle object format from Supabase (if location is returned as object)
  if (location && typeof location === 'object') {
    // Check for longitude/latitude properties (from PostGIS ST_X/ST_Y)
    if (location.longitude !== undefined && location.latitude !== undefined) {
      return {
        lon: parseFloat(location.longitude),
        lat: parseFloat(location.latitude),
      }
    }
    // Check for coordinates array [lon, lat]
    if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      return {
        lon: parseFloat(location.coordinates[0]),
        lat: parseFloat(location.coordinates[1]),
      }
    }
    // Check for x/y properties
    if (location.x !== undefined && location.y !== undefined) {
      return {
        lon: parseFloat(location.x),
        lat: parseFloat(location.y),
      }
    }
    // Check for lon/lat properties
    if (location.lon !== undefined && location.lat !== undefined) {
      return {
        lon: parseFloat(location.lon),
        lat: parseFloat(location.lat),
      }
    }
  }
  
  return null
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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
 * Clean up expired spawns (run periodically)
 */
export async function cleanupExpiredSpawns() {
  try {
    const { error } = await supabase
      .from('spawns')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) throw error
  } catch (error) {
    console.error('Error cleaning up expired spawns:', error)
  }
}

