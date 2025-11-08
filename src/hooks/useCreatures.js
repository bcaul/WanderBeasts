import { useState, useEffect } from 'react'
import { getNearbySpawns } from '../lib/spawning.js'

/**
 * Hook for fetching nearby creatures
 * @param {number|null} latitude - User latitude
 * @param {number|null} longitude - User longitude
 * @param {number} radiusMeters - Search radius in meters
 * @param {number} refreshInterval - Refresh interval in milliseconds
 */
export function useCreatures(latitude, longitude, radiusMeters = 500, refreshInterval = 10000) {
  const [creatures, setCreatures] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!latitude || !longitude) {
      setCreatures([])
      return
    }

    const fetchCreatures = async () => {
      try {
        setLoading(true)
        setError(null)
        const spawns = await getNearbySpawns(latitude, longitude, radiusMeters)
        setCreatures(spawns || [])
      } catch (err) {
        setError(err.message)
        console.error('Error fetching creatures:', err)
        setCreatures([])
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch immediately
    fetchCreatures()

    // Set up interval for refreshing (reduced to 10 seconds for testing)
    const intervalId = setInterval(fetchCreatures, refreshInterval)

    return () => clearInterval(intervalId)
  }, [latitude, longitude, radiusMeters, refreshInterval])

  return { creatures, loading, error }
}

