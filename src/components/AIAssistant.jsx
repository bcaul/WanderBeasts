import { useState, useEffect } from 'react'
import { getCachedRecommendations } from '../lib/gemini.js'
import { getNearbyParks } from '../lib/overpass.js'
import { getLocationDetails } from '../lib/geocoding.js'
import { supabase } from '../lib/supabase.js'
import { Sparkles, X, ChevronDown, RefreshCw, MapPin, TreePine } from 'lucide-react'

export default function AIAssistant({ latitude, longitude, inPark, parkName }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    if (!latitude || !longitude) return

    fetchRecommendations()
  }, [latitude, longitude, inPark])

  const fetchRecommendations = async (showLoading = true) => {
    if (showLoading) setLoading(true)
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

      // Get location details (city, country) - wrap in try/catch to prevent blocking
      let locationDetails = {}
      try {
        locationDetails = await getLocationDetails(latitude, longitude)
      } catch (error) {
        // Silently fail - location details are nice to have but not required
        console.warn('Could not get location details for AI assistant:', error.message)
      }
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
      setLastUpdate(new Date())
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
      <div className="absolute bottom-24 right-4 z-10 animate-in slide-in-from-right duration-300">
        <button
          onClick={() => {
            setMinimized(false)
            setExpanded(true)
          }}
          className="group relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 text-white rounded-full p-5 shadow-2xl hover:shadow-emerald-500/50 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-emerald-300/50 hover:border-emerald-200/70"
          aria-label="Open AI Assistant"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/40 to-transparent rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <Sparkles className="relative z-10 animate-pulse drop-shadow-lg" size={26} />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-24 right-4 z-10 max-w-sm w-full animate-in slide-in-from-right duration-300">
      <div className="relative bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border-2 border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 rounded-3xl"></div>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-600/50 via-emerald-500/40 to-emerald-600/50 px-5 py-4 flex items-center justify-between border-b-2 border-emerald-400/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/30 blur-2xl rounded-full"></div>
              <Sparkles className="relative text-emerald-200 animate-pulse drop-shadow-lg" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight text-shadow-sm">AI Hunting Tips</h3>
              {lastUpdate && (
                <p className="text-xs text-emerald-100/90 font-semibold mt-0.5 text-shadow-sm">
                  Updated {new Date(lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchRecommendations(true)}
              disabled={loading}
              className="text-emerald-100 hover:text-white transition-all p-2 rounded-xl hover:bg-emerald-500/30 disabled:opacity-50 hover:scale-110 active:scale-95"
              title="Refresh tips"
              aria-label="Refresh AI tips"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-emerald-100 hover:text-white transition-all p-2 rounded-xl hover:bg-emerald-500/30 hover:scale-110 active:scale-95"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              <ChevronDown
                size={18}
                className={`transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="text-emerald-100 hover:text-white transition-all p-2 rounded-xl hover:bg-red-500/30 hover:scale-110 active:scale-95"
              aria-label="Minimize"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {expanded && (
          <div className="relative p-5 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {/* Park Boost Banner */}
            {inPark && (
              <div className="relative bg-gradient-to-r from-emerald-500/30 via-emerald-600/25 to-green-600/30 border-2 border-emerald-400/50 rounded-2xl p-4 backdrop-blur-md animate-in fade-in slide-in-from-top shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-500/20 rounded-2xl blur-sm -z-10"></div>
                <div className="flex items-start gap-3">
                  <div className="relative bg-emerald-500/30 rounded-full p-2.5 border border-emerald-300/40">
                    <TreePine className="text-emerald-200 relative z-10" size={20} />
                    <div className="absolute inset-0 bg-emerald-400/40 blur-md rounded-full -z-10"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-emerald-50 font-bold text-sm mb-1.5 flex items-center gap-2 text-shadow-sm">
                      Park Boost Active! <span className="text-lg">🌳</span>
                    </p>
                    <p className="text-emerald-100/95 text-xs leading-relaxed font-medium text-shadow-sm">
                      You're in <span className="font-bold text-white">{parkName || 'a park'}</span>. Creature spawn rates are boosted here!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-10">
                <div className="relative inline-block mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-emerald-500/30 border-t-emerald-400 mx-auto"></div>
                  <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-emerald-400/30"></div>
                  <Sparkles className="absolute inset-0 m-auto text-emerald-300 animate-pulse drop-shadow-lg" size={20} />
                </div>
                <p className="text-emerald-100 text-sm font-bold mb-1 text-shadow-sm">Analyzing your location...</p>
                <p className="text-emerald-200/70 text-xs font-medium text-shadow-sm">Finding the best hunting spots</p>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((tip, index) => (
                <div
                  key={index}
                    className="group relative bg-gradient-to-br from-gray-800/70 via-gray-800/50 to-gray-900/60 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-4 text-sm text-gray-100 hover:border-emerald-400/50 hover:bg-gray-800/80 transition-all duration-300 animate-in fade-in slide-in-from-right hover:scale-[1.02] hover:shadow-lg"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="flex-shrink-0 mt-0.5 text-xl filter drop-shadow-lg">{tip.match(/^[🌊🏔🦌🏙⭐🎯🌳🦅🔥💧]/)?.[0] || '💡'}</div>
                      <p className="flex-1 leading-relaxed font-semibold text-gray-50 text-shadow-sm">{tip.replace(/^[🌊🏔🦌🏙⭐🎯🌳🦅🔥💧]\s*/, '')}</p>
                    </div>
                  </div>
                ))}
                </div>
            ) : (
              <div className="text-center py-10">
                <div className="relative inline-block mb-4">
                  <MapPin className="text-emerald-400/40 mx-auto relative z-10" size={40} />
                  <div className="absolute inset-0 bg-emerald-400/10 blur-2xl rounded-full"></div>
                </div>
                <p className="text-gray-200 text-sm font-bold mb-1 text-shadow-sm">No tips available</p>
                <p className="text-gray-300 text-xs font-medium text-shadow-sm">Move to a new location to get hunting tips</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

