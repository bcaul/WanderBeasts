import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { getCreatureSprite } from '../lib/creatureSprites.js'
import { X } from 'lucide-react'

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export default function CatchModal({ creature, userLocation, onClose }) {
  const [catching, setCatching] = useState(false)
  const [caught, setCaught] = useState(false)
  const [error, setError] = useState(null)

  if (!creature || !creature.creature_types) {
    return null
  }

  const creatureType = creature.creature_types
  
  // Get coordinates - prioritize direct coordinates from Map component (already parsed)
  // The Map component should pass latitude/longitude directly when marker is clicked
  let lat, lon
  
  // First priority: Use direct coordinates (should be passed from Map component)
  if (creature.latitude !== undefined && creature.longitude !== undefined) {
    lat = parseFloat(creature.latitude)
    lon = parseFloat(creature.longitude)
  } else if (creature.location) {
    // Fallback: Parse from location string/WKB if direct coordinates not available
    const parseLocation = (location) => {
      // Handle WKB hex format
      if (typeof location === 'string' && location.startsWith('0101')) {
        try {
          const xHex = location.substring(18, 34)
          const yHex = location.substring(34, 50)
          const parseDouble = (hexStr) => {
            const buffer = new ArrayBuffer(8)
            const view = new DataView(buffer)
            for (let i = 0; i < 8; i++) {
              view.setUint8(i, parseInt(hexStr.substr(i * 2, 2), 16))
            }
            return view.getFloat64(0, true)
          }
          return { lon: parseDouble(xHex), lat: parseDouble(yHex) }
        } catch (error) {
          console.error('Error parsing WKB in modal:', error)
          return null
        }
      }
      
      // Handle WKT string format
      if (typeof location === 'string') {
        const match = location.match(/POINT\(([^)]+)\)/)
        if (match) {
          const coords = match[1].trim().split(/\s+/)
          if (coords.length >= 2) {
            return { lon: parseFloat(coords[0]), lat: parseFloat(coords[1]) }
          }
        }
      }
      
      // Handle object format
      if (location && typeof location === 'object' && location.coordinates) {
        return { lon: location.coordinates[0], lat: location.coordinates[1] }
      }
      
      return null
    }
    
    const parsed = parseLocation(creature.location)
    if (parsed) {
      lon = parsed.lon
      lat = parsed.lat
    }
  }
  
  // Validate coordinates
  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    console.error('CatchModal: Invalid coordinates:', { lat, lon, creature })
  }

  const handleCatch = async () => {
    if (!userLocation || !lat || !lon) {
      console.error('Missing location data:', { userLocation, lat, lon, creature })
      setError('Location not available')
      return
    }

    // Check if within range (50 meters)
    // Make sure coordinates are valid numbers
    const userLat = parseFloat(userLocation.latitude)
    const userLon = parseFloat(userLocation.longitude)
    const creatureLat = parseFloat(lat)
    const creatureLon = parseFloat(lon)
    
    if (isNaN(userLat) || isNaN(userLon) || isNaN(creatureLat) || isNaN(creatureLon)) {
      setError('Invalid location data. Please try again.')
      return
    }
    
    const distance = calculateDistance(userLat, userLon, creatureLat, creatureLon)
    
    // For testing: allow catching if within 100m (more lenient)
    if (distance > 100) {
      setError(`You are too far away! (${distance.toFixed(0)}m away, need to be within 100m)`)
      return
    }

    setCatching(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Check if user profile exists (required for foreign key constraint)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('Profile not found for user:', user.id, profileError)
        // Try to create profile if it doesn't exist
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`,
          })
          .select()
          .single()

        if (createProfileError) {
          console.error('Failed to create profile:', createProfileError)
          throw new Error('Profile not found and could not be created. Please contact support or try signing out and back in.')
        }
      }

      // Check if spawn still exists and hasn't expired
      const { data: spawn, error: spawnError } = await supabase
        .from('spawns')
        .select('*')
        .eq('id', creature.id)
        .single()

      if (spawnError || !spawn) {
        throw new Error('This creature has already been caught or expired!')
      }

      if (new Date(spawn.expires_at) < new Date()) {
        throw new Error('This creature has expired!')
      }

      // Generate random CP level (1-100)
      const cpLevel = Math.floor(Math.random() * 100) + 1

      // Add to catches
      const { error: catchError } = await supabase.from('catches').insert({
        user_id: user.id,
        creature_type_id: creatureType.id,
        catch_location: `POINT(${userLocation.longitude} ${userLocation.latitude})`,
        cp_level: cpLevel,
      })

      if (catchError) {
        console.error('Error inserting catch:', catchError)
        // Provide more helpful error message
        if (catchError.code === '23503' || catchError.message?.includes('foreign key')) {
          throw new Error('Database error: Your profile may not be set up correctly. Please try signing out and back in.')
        }
        throw catchError
      }

      // Delete the spawn (one-time catch)
      await supabase.from('spawns').delete().eq('id', creature.id)

      // Update user stats
      await supabase.rpc('increment_catches', { user_id: user.id })

      setCaught(true)

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err.message)
      setCatching(false)
    }
  }


  const getRarityColor = (rarity) => {
    const colors = {
      common: 'text-secondary',
      uncommon: 'text-accent',
      rare: 'text-rare',
      epic: 'text-primary',
      legendary: 'text-legendary',
    }
    return colors[rarity] || 'text-secondary'
  }

  const getCreatureEmoji = (name) => {
    const emojiMap = {
      'Beach Buddy': '🌊',
      'Mountain Mite': '⛰️',
      'City Slicker': '🏙️',
      'Forest Friend': '🦌',
      'Landmark Legend': '🐉',
    }
    return emojiMap[name] || '🐾'
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close modal when clicking backdrop (not the modal content)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-2xl animate-bounce-in relative"
        onClick={(e) => {
          // Prevent closing when clicking inside modal
          e.stopPropagation()
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {caught ? (
          <div className="text-center py-8">
            <div className="mb-4 animate-catch flex justify-center">
              {getCreatureSprite(creatureType) ? (
                <img 
                  src={getCreatureSprite(creatureType)} 
                  alt={creatureType.name}
                  className="w-32 h-32 object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'block'
                  }}
                />
              ) : null}
              <div className="text-8xl" style={{ display: getCreatureSprite(creatureType) ? 'none' : 'block' }}>
                {getCreatureEmoji(creatureType.name)}
              </div>
            </div>
            <h2 className="text-3xl font-bold text-primary mb-2">Gotcha!</h2>
            <p className="text-xl text-gray-300 mb-4">
              You caught {creatureType.name}!
            </p>
            <p className="text-gray-400">Adding to your collection...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="mb-4 flex justify-center">
                {getCreatureSprite(creatureType) ? (
                  <img 
                    src={getCreatureSprite(creatureType)} 
                    alt={creatureType.name}
                    className="w-32 h-32 object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'block'
                    }}
                  />
                ) : null}
                <div className="text-8xl" style={{ display: getCreatureSprite(creatureType) ? 'none' : 'block' }}>
                  {getCreatureEmoji(creatureType.name)}
                </div>
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${getRarityColor(creatureType.rarity)}`}>
                {creatureType.name}
              </h2>
              <p className="text-gray-400 capitalize">{creatureType.rarity} • {creatureType.type}</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCatch}
                disabled={catching}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {catching ? 'Catching...' : 'Catch!'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

