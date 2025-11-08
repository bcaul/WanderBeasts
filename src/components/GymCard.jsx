import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { MapPin, Users, Calendar } from 'lucide-react'
import { calculateDistance, formatDistance } from '../lib/geolocation.js'

export default function GymCard({ gym, userLatitude, userLongitude }) {
  const [rsvpCount, setRsvpCount] = useState(0)
  const [hasRSVPed, setHasRSVPed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRSVPData()
  }, [gym.id])

  const fetchRSVPData = async () => {
    try {
      // Get RSVP count
      const { data: rsvps, error: rsvpError } = await supabase
        .from('rsvps')
        .select('user_id')
        .eq('gym_id', gym.id)

      if (!rsvpError) {
        setRsvpCount(rsvps?.length || 0)

        // Check if current user has RSVPed
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const userRSVP = rsvps?.find(r => r.user_id === user.id)
          setHasRSVPed(!!userRSVP)
        }
      }
    } catch (error) {
      console.error('Error fetching RSVP data:', error)
    }
  }

  const handleRSVP = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to RSVP')
        return
      }

      if (hasRSVPed) {
        // Cancel RSVP
        const { error } = await supabase
          .from('rsvps')
          .delete()
          .eq('gym_id', gym.id)
          .eq('user_id', user.id)

        if (error) throw error
        setHasRSVPed(false)
        setRsvpCount(prev => prev - 1)
      } else {
        // Create RSVP
        const { error } = await supabase.from('rsvps').insert({
          gym_id: gym.id,
          user_id: user.id,
        })

        if (error) throw error
        setHasRSVPed(true)
        setRsvpCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling RSVP:', error)
      alert('Failed to update RSVP')
    } finally {
      setLoading(false)
    }
  }

  const parseLocation = (location) => {
    if (typeof location === 'string') {
      const match = location.match(/POINT\(([^)]+)\)/)
      if (match) {
        const coords = match[1].trim().split(/\s+/)
        if (coords.length >= 2) {
          return [parseFloat(coords[0]), parseFloat(coords[1])]
        }
      }
    }
    // Handle case where location might be an object with coordinates
    if (location && typeof location === 'object' && location.coordinates) {
      return [location.coordinates[0], location.coordinates[1]]
    }
    return [null, null]
  }

  const [lon, lat] = parseLocation(gym.location)
  const distance = userLatitude && userLongitude && lat && lon
    ? calculateDistance(userLatitude, userLongitude, lat, lon)
    : null

  return (
    <div className="bg-surface rounded-lg p-4 border border-gray-700 hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{gym.name}</h3>
          {gym.description && (
            <p className="text-gray-400 text-sm mb-2">{gym.description}</p>
          )}
        </div>
        {distance !== null && (
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <MapPin size={16} />
            <span>{formatDistance(distance)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-gray-400 text-sm">
          <div className="flex items-center gap-1">
            <Users size={16} />
            <span>{rsvpCount} RSVPs</span>
          </div>
        </div>

        <button
          onClick={handleRSVP}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            hasRSVPed
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-primary hover:bg-primary/90 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? '...' : hasRSVPed ? 'Cancel RSVP' : 'RSVP'}
        </button>
      </div>

      {gym.booking_url && (
        <a
          href={gym.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-secondary hover:text-secondary/80 text-sm"
        >
          <Calendar size={16} />
          <span>Book accommodation</span>
        </a>
      )}
    </div>
  )
}

