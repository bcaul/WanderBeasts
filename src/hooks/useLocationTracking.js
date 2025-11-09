import { useEffect, useRef } from 'react'
import { calculateDistance, isValidCoordinate } from '../lib/geolocation.js'
import { updateWalkingChallengeProgress } from '../lib/challengeProgress.js'
import { supabase } from '../lib/supabase.js'

/**
 * Hook to track user movement and update walking challenges
 * Tracks distance traveled and updates challenge progress automatically
 */
export function useLocationTracking(location) {
  const lastLocationRef = useRef(null)
  const distanceTraveledRef = useRef(0)
  const trackingIntervalRef = useRef(null)
  const lastUpdateTimeRef = useRef(0)

  useEffect(() => {
    if (!location || !isValidCoordinate(location.latitude, location.longitude)) {
      return
    }

    const now = Date.now()
    const currentAccuracy = location.accuracy || 100 // Default to 100m if accuracy not available
    const timeSinceLastUpdate = lastLocationRef.current
      ? now - lastLocationRef.current.timestamp
      : 0

    // Calculate distance from last location
    if (lastLocationRef.current) {
      const distance = calculateDistance(
        lastLocationRef.current.latitude,
        lastLocationRef.current.longitude,
        location.latitude,
        location.longitude
      )

      // Adaptive jump detection based on accuracy and time
      // If accuracy is good (< 50m) and distance is reasonable, accept it
      // If a long time has passed (> 60s), larger jumps might be legitimate
      // Use accuracy to determine reasonable jump threshold
      const accuracyThreshold = Math.max(currentAccuracy * 3, 50) // At least 50m, or 3x accuracy
      const timeBasedThreshold = timeSinceLastUpdate > 60000 ? 2000 : 1000 // 2km if > 60s, else 1km
      const jumpThreshold = Math.min(accuracyThreshold, timeBasedThreshold)

      // Only count movement for distance tracking if it's reasonable
      // Minimum 3 meters to count as movement (filter GPS jitter)
      if (distance >= 3 && distance < jumpThreshold) {
        distanceTraveledRef.current += distance
      } else if (distance >= jumpThreshold) {
        // Log but don't prevent location update - location should still update on map
        // This might be a legitimate jump (GPS lock, network change, etc.)
        // Only warn in development to reduce console noise
        if (import.meta.env.DEV) {
          console.warn(`GPS jump detected: ${distance.toFixed(2)}m (threshold: ${jumpThreshold.toFixed(2)}m, accuracy: ${currentAccuracy?.toFixed(2)}m) - not counting for distance tracking but updating location`)
        }
      }
    }

    // Always update location reference so map shows current position
    // Even if we don't count it for distance tracking
    lastLocationRef.current = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: now,
      accuracy: currentAccuracy,
    }

    // Update walking challenges periodically
    const updateWalkingChallenges = async () => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current
      const updateInterval = 30000 // Update every 30 seconds
      const minDistanceForUpdate = 10 // Minimum 10 meters to update

      // Update if enough time has passed and distance traveled
      if (timeSinceLastUpdate >= updateInterval && distanceTraveledRef.current >= minDistanceForUpdate) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user && location) {
            const distanceToUpdate = distanceTraveledRef.current
            await updateWalkingChallengeProgress(
              user.id,
              location.latitude,
              location.longitude,
              distanceToUpdate
            )
            distanceTraveledRef.current = 0 // Reset after updating
            lastUpdateTimeRef.current = now
          }
        } catch (error) {
          console.error('Error updating walking challenge progress:', error)
        }
      }
    }

    // Set up interval for periodic updates
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current)
    }

    trackingIntervalRef.current = setInterval(updateWalkingChallenges, 30000) // Check every 30 seconds

    // Also update immediately if significant distance traveled (100m+)
    if (distanceTraveledRef.current >= 100) {
      updateWalkingChallenges()
    }

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current)
      }
    }
  }, [location])
}

