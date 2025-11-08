import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Hook to fetch nearby challenges
 */
export function useChallenges(latitude, longitude, radiusMeters = 2000) {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!latitude || !longitude) {
      setChallenges([])
      setLoading(false)
      return
    }

    fetchChallenges()
    
    // Refresh challenges every 30 seconds
    const interval = setInterval(fetchChallenges, 30000)
    return () => clearInterval(interval)
  }, [latitude, longitude, radiusMeters])

  const fetchChallenges = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try RPC function first
      const { data, error: rpcError } = await supabase.rpc('get_nearby_challenges', {
        user_lat: latitude,
        user_lon: longitude,
        search_radius_meters: radiusMeters,
      })

      if (!rpcError && data) {
        setChallenges(data)
        setLoading(false)
        return
      }

      // Fallback: Get all active challenges and filter client-side
      const { data: allChallenges, error: queryError } = await supabase
        .from('challenges')
        .select(`
          *,
          creature_types:target_creature_type_id (name)
        `)
        .eq('active', true)
        .is('expires_at', null)
        .or('expires_at.gt.' + new Date().toISOString())

      if (queryError) {
        console.error('Error fetching challenges:', queryError)
        setError(queryError.message)
        setLoading(false)
        return
      }

      if (!allChallenges || allChallenges.length === 0) {
        setChallenges([])
        setLoading(false)
        return
      }

      // Parse locations and filter by distance
      const parseLocation = (location) => {
        if (!location) return null
        if (typeof location === 'object' && location.coordinates) {
          return { lon: location.coordinates[0], lat: location.coordinates[1] }
        }
        if (typeof location === 'string' && location.startsWith('0101')) {
          // WKB hex format - would need parsing
          return null
        }
        const match = location.match(/POINT\(([^)]+)\)/)
        if (match) {
          const coords = match[1].trim().split(/\s+/)
          if (coords.length >= 2) {
            return { lon: parseFloat(coords[0]), lat: parseFloat(coords[1]) }
          }
        }
        return null
      }

      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3
        const φ1 = (lat1 * Math.PI) / 180
        const φ2 = (lat2 * Math.PI) / 180
        const Δφ = ((lat2 - lat1) * Math.PI) / 180
        const Δλ = ((lon2 - lon1) * Math.PI) / 180
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
      }

      // Get user's accepted challenges
      const { data: { user } } = await supabase.auth.getUser()
      let userChallenges = []
      if (user) {
        const { data: uc } = await supabase
          .from('user_challenges')
          .select('*')
          .eq('user_id', user.id)
        userChallenges = uc || []
      }

      // Filter and enrich challenges
      const nearbyChallenges = allChallenges
        .map(challenge => {
          const coords = parseLocation(challenge.location)
          if (!coords) return null

          const distance = calculateDistance(latitude, longitude, coords.lat, coords.lon)
          if (distance > radiusMeters) return null

          const userChallenge = userChallenges.find(uc => uc.challenge_id === challenge.id)
          return {
            ...challenge,
            longitude: coords.lon,
            latitude: coords.lat,
            distance_meters: distance,
            accepted: !!userChallenge,
            progress_value: userChallenge?.progress_value || 0,
            completed: userChallenge?.completed || false,
          }
        })
        .filter(c => c !== null)
        .sort((a, b) => a.distance_meters - b.distance_meters)

      setChallenges(nearbyChallenges)
    } catch (err) {
      console.error('Error in fetchChallenges:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { challenges, loading, error, refetch: fetchChallenges }
}

