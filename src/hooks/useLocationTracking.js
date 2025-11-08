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

    // Calculate distance from last location
    if (lastLocationRef.current) {
      const distance = calculateDistance(
        lastLocationRef.current.latitude,
        lastLocationRef.current.longitude,
        location.latitude,
        location.longitude
      )

      // Only count significant movement (filter out GPS jitter)
      // Minimum 3 meters to count as movement (reduced for better tracking)
      // Maximum 500 meters to filter out unrealistic GPS jumps
      if (distance >= 3 && distance < 500) {
        distanceTraveledRef.current += distance
        console.log(`Distance traveled: ${distanceTraveledRef.current.toFixed(2)}m (segment: ${distance.toFixed(2)}m)`)
      } else if (distance >= 500) {
        console.warn(`GPS jump detected: ${distance.toFixed(2)}m - ignoring`)
      }
    }

    lastLocationRef.current = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: Date.now(),
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
            console.log(`Updated walking challenges: ${distanceToUpdate.toFixed(2)}m`)
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

