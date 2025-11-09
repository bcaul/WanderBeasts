import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { trackPlayerAtGyms, checkAndSpawnGymCreatures } from '../lib/gymSpawning.js'

/**
 * Hook to track player location at gyms and trigger spawns
 * Updates player location when near gyms and checks for spawn triggers
 * @param {Object} location - Player location with latitude and longitude
 * @param {Array} gyms - Array of gym objects
 */
export function useGymTracking(location, gyms) {
  const lastUpdateRef = useRef(0)
  const spawnCheckIntervalRef = useRef(null)

  useEffect(() => {
    if (!location || !gyms || gyms.length === 0) {
      return
    }

    const updateGymTracking = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          return
        }

        // Throttle updates (every 30 seconds)
        const now = Date.now()
        if (now - lastUpdateRef.current < 30000) {
          return
        }

        lastUpdateRef.current = now

        // Track player at nearby gyms
        await trackPlayerAtGyms(
          user.id,
          location.latitude,
          location.longitude,
          gyms,
          100 // 100 meter radius
        )
      } catch (error) {
        console.error('Error updating gym tracking:', error)
      }
    }

    // Update immediately
    updateGymTracking()

    // Set up interval for periodic updates
    const intervalId = setInterval(updateGymTracking, 30000) // Every 30 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [location, gyms])

  // Periodically refresh gym creatures and check spawn triggers
  useEffect(() => {
    const refreshAndCheck = async () => {
      try {
        // First, ensure all gyms have creatures (refresh if needed)
        await supabase.rpc('refresh_gym_creatures')
        
        // Then check if we need to spawn more when 5+ players are present
        await checkAndSpawnGymCreatures()
      } catch (error) {
        console.error('Error refreshing gym creatures:', error)
      }
    }

    // Refresh every 5 minutes to ensure gyms always have creatures
    spawnCheckIntervalRef.current = setInterval(refreshAndCheck, 5 * 60000) // Every 5 minutes

    // Initial refresh
    refreshAndCheck()

    return () => {
      if (spawnCheckIntervalRef.current) {
        clearInterval(spawnCheckIntervalRef.current)
      }
    }
  }, [])
}

