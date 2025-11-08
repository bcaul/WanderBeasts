import { useState, useEffect, useRef } from 'react'
import { getCurrentLocation, watchLocation } from '../lib/geolocation.js'

/**
 * Hook for real-time user location tracking
 * @param {boolean} watch - Whether to continuously watch location (default: true)
 * @param {number} updateInterval - Update interval in milliseconds (default: 10000)
 */
export function useLocation(watch = true, updateInterval = 10000) {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const watchIdRef = useRef(null)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    let mounted = true

    const updateLocation = async () => {
      try {
        setError(null)
        const position = await getCurrentLocation()
        if (mounted) {
          setLocation(position)
          setLoading(false)
          lastUpdateRef.current = Date.now()
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    // Initial location
    updateLocation()

    if (watch) {
      // Watch location with throttling
      watchIdRef.current = watchLocation(
        (position) => {
          const now = Date.now()
          if (now - lastUpdateRef.current >= updateInterval) {
            if (mounted) {
              setLocation(position)
              lastUpdateRef.current = now
            }
          }
        },
        (err) => {
          if (mounted) {
            setError(err.message)
          }
        }
      )
    }

    return () => {
      mounted = false
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [watch, updateInterval])

  return { location, error, loading }
}

