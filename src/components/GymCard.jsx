import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { MapPin, Users, Calendar, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { calculateDistance, formatDistance } from '../lib/geolocation.js'
import { getGymRSVPs, getGymSpawns, countPlayersAtGym } from '../lib/gymSpawning.js'

export default function GymCard({ gym, userLatitude, userLongitude }) {
  const [rsvpCount, setRsvpCount] = useState(0)
  const [rsvpList, setRsvpList] = useState([])
  const [hasRSVPed, setHasRSVPed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeSpawns, setActiveSpawns] = useState([])
  const [playerCount, setPlayerCount] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchGymData()
    // Refresh more frequently to catch RSVP updates (10 seconds)
    const interval = setInterval(fetchGymData, 10000)
    
    // Also subscribe to real-time RSVP changes for this gym
    const subscription = supabase
      .channel(`gym-rsvps-${gym.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rsvps',
        filter: `gym_id=eq.${gym.id}`
      }, () => {
        // Immediately refresh when RSVPs change for this gym
        fetchGymData()
      })
      .subscribe()
    
    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [gym.id])

  const fetchGymData = async () => {
    try {
      // Get RSVPs with user profiles
      const rsvps = await getGymRSVPs(gym.id)
      setRsvpList(rsvps || [])
      setRsvpCount(rsvps?.length || 0)

      // Check if current user has RSVPed
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const userRSVP = rsvps?.find(r => r.user_id === user.id)
        setHasRSVPed(!!userRSVP)
      }

      // Get active spawns (epic/legendary creatures)
      const spawns = await getGymSpawns(gym.id)
      setActiveSpawns(spawns || [])

      // Get player count at gym
      const count = await countPlayersAtGym(gym.id, 100)
      setPlayerCount(count || 0)
    } catch (error) {
      console.error('Error fetching gym data:', error)
    }
  }

  const handleRSVP = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to RSVP')
        setLoading(false)
        return
      }

      if (hasRSVPed) {
        // Cancel RSVP
        const { error } = await supabase
          .from('rsvps')
          .delete()
          .eq('gym_id', gym.id)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error deleting RSVP:', error)
          throw error
        }
        
        // Immediately update local state
        setHasRSVPed(false)
        setRsvpCount(prev => Math.max(0, prev - 1))
      } else {
        // Create RSVP
        const { error } = await supabase
          .from('rsvps')
          .insert({
            gym_id: gym.id,
            user_id: user.id,
          })

        if (error) {
          console.error('Error creating RSVP:', error)
          throw error
        }
        
        // Immediately update local state
        setHasRSVPed(true)
        setRsvpCount(prev => prev + 1)
      }
      
      // Refresh gym data after RSVP change (with small delay to allow DB to update)
      setTimeout(() => {
        fetchGymData()
      }, 500)
    } catch (error) {
      console.error('Error toggling RSVP:', error)
      alert(`Failed to update RSVP: ${error.message || 'Unknown error'}`)
      // Revert optimistic update on error
      await fetchGymData()
    } finally {
      setLoading(false)
    }
  }

  // Parse location - handle WKB hex, WKT, or already parsed coordinates
  const parseLocation = (location) => {
    // If gym already has latitude/longitude (from useGyms hook), use those
    if (gym.latitude && gym.longitude) {
      return [gym.longitude, gym.latitude]
    }
    
    // Handle WKB hex string (from PostGIS)
    if (typeof location === 'string' && (location.startsWith('0101') || location.length > 40)) {
      const coords = parseWKBHex(location)
      if (coords) {
        return [coords.lon, coords.lat]
      }
    }
    
    // Handle WKT format
    if (typeof location === 'string') {
      const match = location.match(/POINT\(([^)]+)\)/)
      if (match) {
        const coords = match[1].trim().split(/\s+/)
        if (coords.length >= 2) {
          return [parseFloat(coords[0]), parseFloat(coords[1])]
        }
      }
    }
    
    // Handle object with coordinates
    if (location && typeof location === 'object') {
      if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
        return [location.coordinates[0], location.coordinates[1]]
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

  // Helper to parse WKB hex (same as in useGyms)
  const parseWKBHex = (hex) => {
    try {
      if (!hex || typeof hex !== 'string' || hex.length < 50) {
        return null
      }
      const endian = parseInt(hex.substring(0, 2), 16)
      const isLittleEndian = endian === 1
      const xHex = hex.substring(18, 34)
      const yHex = hex.substring(34, 50)
      
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
        return null
      }
      
      return { lon, lat }
    } catch (error) {
      return null
    }
  }

  const [lon, lat] = parseLocation(gym.location)
  const distance = userLatitude && userLongitude && lat && lon
    ? calculateDistance(userLatitude, userLongitude, lat, lon)
    : null

  const getRarityColor = (rarity) => {
    const colors = {
      epic: '#FF6B6B',
      legendary: '#F39C12',
    }
    return colors[rarity] || '#4ECDC4'
  }

  return (
    <div className="bg-surface rounded-lg p-4 border border-gray-700 hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-white">{gym.name}</h3>
            {activeSpawns.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">
                <Zap size={12} />
                <span>Active!</span>
              </div>
            )}
          </div>
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

      {/* Active creatures indicator */}
      {activeSpawns.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <div className="text-yellow-400 text-sm font-semibold mb-1">
            Epic/Legendary Creatures Active!
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSpawns.slice(0, 3).map((spawn) => (
              <div
                key={spawn.id}
                className="px-2 py-1 rounded text-xs"
                style={{
                  backgroundColor: getRarityColor(spawn.creature_types?.rarity) + '20',
                  color: getRarityColor(spawn.creature_types?.rarity),
                  border: `1px solid ${getRarityColor(spawn.creature_types?.rarity)}40`
                }}
              >
                {spawn.creature_types?.name} ({spawn.creature_types?.rarity})
              </div>
            ))}
            {activeSpawns.length > 3 && (
              <div className="px-2 py-1 text-xs text-gray-400">
                +{activeSpawns.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player count and RSVP info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-gray-400 text-sm">
          <div className="flex items-center gap-1">
            <Users size={16} />
            <span>{rsvpCount} RSVPs</span>
          </div>
          {playerCount > 0 && (
            <div className="flex items-center gap-1 text-blue-400">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              <span>{playerCount} players nearby</span>
            </div>
          )}
          {playerCount >= 5 && (
            <div className="flex items-center gap-1 text-green-400 font-semibold">
              <Zap size={14} />
              <span>Creatures spawning!</span>
            </div>
          )}
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

      {/* Expandable details */}
      {(rsvpList.length > 0 || activeSpawns.length > 0) && (
        <div className="border-t border-gray-700 pt-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-gray-400 hover:text-white transition-colors text-sm"
          >
            <span>View Details</span>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDetails && (
            <div className="mt-3 space-y-3">
              {/* RSVP List */}
              {rsvpList.length > 0 && (
                <div>
                  <div className="text-gray-400 text-sm font-semibold mb-2">
                    Players RSVPed ({rsvpList.length}):
                  </div>
                  <div className="space-y-1">
                    {rsvpList.map((rsvp) => (
                      <div
                        key={rsvp.id}
                        className="text-sm text-gray-300 flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                          {rsvp.profiles?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span>{rsvp.profiles?.username || 'Unknown'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Spawns */}
              {activeSpawns.length > 0 && (
                <div>
                  <div className="text-gray-400 text-sm font-semibold mb-2">
                    Active Creatures ({activeSpawns.length}):
                  </div>
                  <div className="space-y-1">
                    {activeSpawns.map((spawn) => (
                      <div
                        key={spawn.id}
                        className="text-sm flex items-center gap-2"
                        style={{
                          color: getRarityColor(spawn.creature_types?.rarity)
                        }}
                      >
                        <span className="font-semibold">
                          {spawn.creature_types?.name}
                        </span>
                        <span className="text-gray-500">
                          ({spawn.creature_types?.rarity})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

