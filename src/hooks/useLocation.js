import { useState, useEffect, useRef } from 'react'
import { getCurrentLocation, watchLocation } from '../lib/geolocation.js'

/**
 * Hook for real-time user location tracking
 * @param {boolean} watch - Whether to continuously watch location (default: true)
 * @param {number} updateInterval - Minimum update interval in milliseconds (default: 3000)
 */
export function useLocation(watch = true, updateInterval = 3000) {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const watchIdRef = useRef(null)
  const lastUpdateRef = useRef(0)
  const retryCountRef = useRef(0)

  useEffect(() => {
    let mounted = true
    let retryTimeout = null

    const updateLocation = async (isRetry = false) => {
      try {
        setError(null)
        const position = await getCurrentLocation()
        if (mounted) {
          // Validate position before setting
          if (position && position.latitude && position.longitude) {
          setLocation(position)
          setLoading(false)
          lastUpdateRef.current = Date.now()
            retryCountRef.current = 0
          } else {
            throw new Error('Invalid location data received')
          }
        }
      } catch (err) {
        if (mounted) {
          console.warn('Location update failed:', err.message)
          // Only set error after multiple failures
          if (retryCountRef.current >= 3) {
          setError(err.message)
          setLoading(false)
          } else {
            // Retry after a delay
            retryCountRef.current++
            retryTimeout = setTimeout(() => {
              if (mounted) {
                updateLocation(true)
              }
            }, 2000)
          }
        }
      }
    }

    // Initial location - don't throttle this
    updateLocation()

    if (watch) {
      // Watch location with smart throttling
      watchIdRef.current = watchLocation(
        (position) => {
          if (!mounted) return
          
          const now = Date.now()
          const timeSinceLastUpdate = now - lastUpdateRef.current
          
          // Use setLocation with a function to access current location state
          setLocation(currentLocation => {
            // Always update if position accuracy improved significantly
            const shouldUpdate = 
              timeSinceLastUpdate >= updateInterval || // Enough time passed
              !currentLocation || // No location yet
              (currentLocation.accuracy && position.accuracy && position.accuracy < currentLocation.accuracy * 0.7) || // Better accuracy
              (currentLocation.accuracy && position.accuracy && position.accuracy < 20 && currentLocation.accuracy >= 20) // Got high accuracy from low
              
            if (shouldUpdate && position && position.latitude && position.longitude) {
              lastUpdateRef.current = now
              retryCountRef.current = 0
              setError(null)
              return position
            }
            return currentLocation // Don't update
          })
        },
        (err) => {
          if (mounted) {
            console.warn('Location watch error:', err.message)
            // Don't set error immediately - geolocation can have temporary issues
            // Only set error if we haven't had a successful update in a while
            const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
            if (timeSinceLastUpdate > 30000) {
            setError(err.message)
            }
          }
        }
      )
    }

    return () => {
      mounted = false
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [watch, updateInterval])

  return { location, error, loading }
}

