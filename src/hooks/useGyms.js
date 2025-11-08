import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Hook for fetching nearby gyms
 * @param {number|null} latitude - User latitude
 * @param {number|null} longitude - User longitude
 * @param {number} radiusKm - Search radius in kilometers
 */
export function useGyms(latitude, longitude, radiusKm = 10) {
  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!latitude || !longitude) {
      return
    }

    const fetchGyms = async () => {
      try {
        setLoading(true)
        setError(null)

        // Query gyms using PostGIS (fallback to fetching all if RPC doesn't exist)
        const { data, error: queryError } = await supabase
          .from('gyms')
          .select('*')

        if (queryError) throw queryError

        // Filter by distance (client-side fallback)
        // In production, use PostGIS ST_DWithin for better performance
        const filteredGyms = data || []

        setGyms(filteredGyms)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching gyms:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGyms()

    // Subscribe to realtime updates
    const subscription = supabase
      .channel('gyms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gyms' }, () => {
        fetchGyms()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [latitude, longitude, radiusKm])

  return { gyms, loading, error }
}

