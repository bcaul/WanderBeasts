import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { isWithinRange } from '../lib/geolocation.js'
import { X } from 'lucide-react'

export default function CatchModal({ creature, userLocation, onClose }) {
  const [catching, setCatching] = useState(false)
  const [caught, setCaught] = useState(false)
  const [error, setError] = useState(null)

  if (!creature || !creature.creature_types) {
    return null
  }

  const creatureType = creature.creature_types
  const [lon, lat] = parseLocation(creature.location)

  const handleCatch = async () => {
    if (!userLocation || !lat || !lon) {
      setError('Location not available')
      return
    }

    // Check if within range (50 meters)
    if (!isWithinRange(userLocation.latitude, userLocation.longitude, lat, lon, 50)) {
      setError('You are too far away! Move closer to catch this creature.')
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

      if (catchError) throw catchError

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-2xl animate-bounce-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {caught ? (
          <div className="text-center py-8">
            <div className="text-8xl mb-4 animate-catch">
              {getCreatureEmoji(creatureType.name)}
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
              <div className="text-8xl mb-4">
                {getCreatureEmoji(creatureType.name)}
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

