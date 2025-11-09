import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Hook for fetching nearby gyms
 * @param {number|null} latitude - User latitude
 * @param {number|null} longitude - User longitude
 * @param {number} radiusMeters - Search radius in meters (default 5000m = 5km)
 */
export function useGyms(latitude, longitude, radiusMeters = 5000) {
  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!latitude || !longitude) {
      setGyms([])
      return
    }

    const fetchGyms = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use PostGIS function to get nearby gyms with RSVP counts
        const { data, error: queryError } = await supabase.rpc('get_nearby_gyms', {
          user_lat: latitude,
          user_lon: longitude,
          radius_meters: radiusMeters
        })

        if (queryError) {
          // Fallback to simple query if RPC doesn't exist
          console.warn('RPC function not available, using fallback:', queryError)
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('gyms')
            .select('*, rsvps(count)')

          if (fallbackError) throw fallbackError

          // Parse location and calculate distance client-side
          const processedGyms = (fallbackData || []).map(gym => {
            const [lon, lat] = parseLocation(gym.location)
            const distance = calculateDistance(latitude, longitude, lat, lon)
            return {
              ...gym,
              latitude: lat,
              longitude: lon,
              distance_meters: distance,
              rsvp_count: gym.rsvps?.[0]?.count || 0
            }
          }).filter(gym => gym.distance_meters <= radiusMeters)
            .sort((a, b) => a.distance_meters - b.distance_meters)

          setGyms(processedGyms)
        } else {
          // Process RPC results - extract coordinates from location (WKB hex format)
          const processedGyms = (data || []).map(gym => {
            // Parse location (WKB hex string from PostGIS GEOGRAPHY type)
            const [lon, lat] = parseLocation(gym.location)
            
            if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
              console.warn('Failed to parse gym coordinates:', {
                name: gym.name,
                location: typeof gym.location === 'string' ? gym.location.substring(0, 20) + '...' : gym.location
              })
              return null
            }
            
            return {
              ...gym,
              latitude: lat,
              longitude: lon
            }
          }).filter(gym => gym !== null) // Remove gyms with invalid coordinates
          
          // STRICT deduplication: Deduplicate by ID AND by location
          // This prevents duplicate gyms with same coordinates but different IDs
          const uniqueGymsObj = {}
          const locationKeyMap = {} // Track by location to prevent duplicates at same coordinates
          
          processedGyms.forEach(gym => {
            // Skip if we've already seen this gym ID
            if (gym.id && uniqueGymsObj[gym.id]) {
              return
            }
            
            // Create location key for deduplication (round to 6 decimal places = ~10cm precision)
            const locationKey = `${gym.latitude?.toFixed(6)},${gym.longitude?.toFixed(6)}`
            
            // Skip if we've already seen a gym at this exact location
            if (locationKeyMap[locationKey]) {
              // Only log in development to reduce console noise
              if (import.meta.env.DEV) {
                console.log('Skipping duplicate gym at same location:', gym.name, gym.id)
              }
              return
            }
            
            // Mark as processed
            if (gym.id) {
              uniqueGymsObj[gym.id] = gym
              locationKeyMap[locationKey] = true
            }
          })
          
          setGyms(Object.values(uniqueGymsObj))
        }
      } catch (err) {
        setError(err.message)
        console.error('Error fetching gyms:', err)
        setGyms([])
      } finally {
        setLoading(false)
      }
    }

    fetchGyms()

    // Subscribe to realtime updates
    const subscription = supabase
      .channel('gyms-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gyms' }, () => {
        fetchGyms()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, () => {
        // Immediately refresh when RSVPs change
        fetchGyms()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spawns' }, (payload) => {
        // Refresh if gym spawns change
        if (payload.new?.gym_id || payload.old?.gym_id) {
          fetchGyms()
        }
      })
      .subscribe()

    // Refresh every 10 seconds to get updated player counts and RSVPs
    const intervalId = setInterval(fetchGyms, 10000)

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
    }
  }, [latitude, longitude, radiusMeters])

  return { gyms, loading, error }
}

// Helper function to parse WKB hex string to coordinates (browser-compatible)
function parseWKBHex(hex) {
  try {
    if (!hex || typeof hex !== 'string' || hex.length < 50) {
      return null
    }
    
    // WKB Extended format with SRID
    // Format: [endian (1 byte)] [type (4 bytes)] [SRID (4 bytes)] [X coord (8 bytes)] [Y coord (8 bytes)]
    // In hex: 2 chars + 8 chars + 8 chars + 16 chars + 16 chars = 50 chars total
    
    // Check endianness (first byte: 01 = little endian, 00 = big endian)
    const endian = parseInt(hex.substring(0, 2), 16)
    const isLittleEndian = endian === 1
    
    // Skip: 2 (endian) + 8 (type) + 8 (SRID) = 18 hex chars
    // Then read X (longitude) and Y (latitude) as 64-bit doubles (16 hex chars each)
    const xHex = hex.substring(18, 34) // Longitude (8 bytes = 16 hex chars)
    const yHex = hex.substring(34, 50) // Latitude (8 bytes = 16 hex chars)
    
    // Convert hex to Float64
    const parseDouble = (hexStr, littleEndian) => {
      const buffer = new ArrayBuffer(8)
      const view = new DataView(buffer)
      for (let i = 0; i < 8; i++) {
        const byteIndex = littleEndian ? i : 7 - i
        view.setUint8(byteIndex, parseInt(hexStr.substr(i * 2, 2), 16))
      }
      return view.getFloat64(0, littleEndian)
    }
    
    const lon = parseDouble(xHex, isLittleEndian)
    const lat = parseDouble(yHex, isLittleEndian)
    
    if (isNaN(lon) || isNaN(lat) || !isFinite(lon) || !isFinite(lat)) {
      console.warn('Invalid coordinates from WKB hex:', { lon, lat, hex: hex.substring(0, 20) })
      return null
    }
    
    return { lon, lat }
  } catch (error) {
    console.warn('Error parsing WKB hex:', error, hex?.substring(0, 20))
    return null
  }
}

// Helper function to parse location (PostGIS geography point)
function parseLocation(location) {
  if (!location) {
    return [null, null]
  }
  
  // Check if it's a WKB hex string (starts with '0101' for Point with SRID)
  // Also check for long hex strings that might be WKB format
  if (typeof location === 'string' && (location.startsWith('0101') || location.length > 40)) {
    const coords = parseWKBHex(location)
    if (coords && coords.lon !== null && coords.lat !== null) {
      return [coords.lon, coords.lat]
    }
  }
  
  // Check if it's WKT format (POINT(...))
  if (typeof location === 'string') {
    const match = location.match(/POINT\(([^)]+)\)/)
    if (match) {
      const coords = match[1].trim().split(/\s+/)
      if (coords.length >= 2) {
        return [parseFloat(coords[0]), parseFloat(coords[1])]
      }
    }
  }
  
  // Check if it's an object with coordinates
  if (location && typeof location === 'object') {
    if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      return [location.coordinates[0], location.coordinates[1]]
    }
    if (location.x !== undefined && location.y !== undefined) {
      return [parseFloat(location.x), parseFloat(location.y)]
    }
    if (location.lon !== undefined && location.lat !== undefined) {
      return [parseFloat(location.lon), parseFloat(location.lat)]
    }
    if (location.lng !== undefined && location.lat !== undefined) {
      return [parseFloat(location.lng), parseFloat(location.lat)]
    }
  }
  
  return [null, null]
}

// Helper function to calculate distance (Haversine formula)
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

