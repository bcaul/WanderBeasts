import { useState, useEffect } from 'react'
import { getCachedRecommendations } from '../lib/gemini.js'
import { getNearbyParks } from '../lib/overpass.js'
import { getLocationDetails } from '../lib/geocoding.js'
import { supabase } from '../lib/supabase.js'
import { Sparkles, X, ChevronUp } from 'lucide-react'

export default function AIAssistant({ latitude, longitude, inPark, parkName }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    if (!latitude || !longitude) return

    fetchRecommendations()
  }, [latitude, longitude, inPark])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      // Get nearby parks
      const parks = await getNearbyParks(latitude, longitude, 2000)
      const parkNames = parks.map(p => p.name).slice(0, 3)

      // Get available creatures
      const { data: creatures } = await supabase
        .from('creature_types')
        .select('*')
        .limit(10)

      // Get recent catches
      const { data: { user } } = await supabase.auth.getUser()
      let recentCatches = []
      if (user) {
        const { data: catches } = await supabase
          .from('catches')
          .select('creature_type_id, creature_types(name)')
          .eq('user_id', user.id)
          .order('caught_at', { ascending: false })
          .limit(3)
        recentCatches = catches || []
      }

      // Get location details (city, country)
      const locationDetails = await getLocationDetails(latitude, longitude)
      const cityName = locationDetails.city || 'Your Location'
      const country = locationDetails.country || locationDetails.countryCode || 'Unknown'

      const context = {
        latitude,
        longitude,
        cityName,
        country,
        nearbyParks: parkNames,
        availableCreatures: creatures || [],
        recentCatches: recentCatches.map(c => ({ name: c.creature_types?.name || 'Unknown' })),
      }

      const locationKey = `${Math.round(latitude * 100) / 100}_${Math.round(longitude * 100) / 100}`
      const tips = await getCachedRecommendations(locationKey, context)
      setRecommendations(tips)
    } catch (error) {
      console.error('Error fetching AI recommendations:', error)
      setRecommendations([
        '🎯 Explore nearby parks for boosted spawn rates!',
        '🌊 Water creatures love coastal areas',
        '🦌 Forest creatures are most active in green spaces',
      ])
    } finally {
      setLoading(false)
    }
  }

  if (minimized) {
    return (
      <div className="absolute bottom-24 right-4 z-10">
        <button
          onClick={() => setMinimized(false)}
          className="bg-surface/90 backdrop-blur-sm border border-primary rounded-full p-3 shadow-lg hover:bg-surface transition-colors"
        >
          <Sparkles className="text-primary" size={24} />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-24 right-4 z-10 max-w-sm w-full">
      <div className="bg-surface/95 backdrop-blur-sm border border-primary/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={20} />
            <h3 className="font-bold text-white">AI Hunting Tips</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ChevronUp
                size={20}
                className={expanded ? 'transform rotate-180' : ''}
              />
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        {expanded && (
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Getting tips...</p>
              </div>
            ) : recommendations.length > 0 ? (
              recommendations.map((tip, index) => (
                <div
                  key={index}
                  className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-200"
                >
                  {tip}
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center">
                No tips available at the moment
              </p>
            )}

            {inPark && (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-sm text-green-200">
                🌳 You're in {parkName || 'a park'}! Spawn rates are boosted here.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

