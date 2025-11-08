import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useLocation } from '../hooks/useLocation.js'
import { Search, MapPin, Grid3x3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchType, setSearchType] = useState('all') // all, creatures, gyms
  const { location } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const searchTimeout = setTimeout(() => {
      performSearch()
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query, searchType])

  const performSearch = async () => {
    setLoading(true)
    try {
      const results = []

      // Search creatures
      if (searchType === 'all' || searchType === 'creatures') {
        const { data: creatures, error: creaturesError } = await supabase
          .from('creature_types')
          .select('*')
          .ilike('name', `%${query}%`)
          .limit(10)

        if (!creaturesError && creatures) {
          results.push(
            ...creatures.map(creature => ({
              type: 'creature',
              id: creature.id,
              name: creature.name,
              rarity: creature.rarity,
              data: creature,
            }))
          )
        }
      }

      // Search gyms
      if (searchType === 'all' || searchType === 'gyms') {
        const { data: gyms, error: gymsError } = await supabase
          .from('gyms')
          .select('*')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(10)

        if (!gymsError && gyms) {
          results.push(
            ...gyms.map(gym => ({
              type: 'gym',
              id: gym.id,
              name: gym.name,
              description: gym.description,
              data: gym,
            }))
          )
        }
      }

      setResults(results)
    } catch (error) {
      console.error('Error performing search:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResultClick = (result) => {
    if (result.type === 'creature') {
      navigate('/collection')
    } else if (result.type === 'gym') {
      // Navigate to map and focus on gym location
      navigate('/')
      // TODO: Focus map on gym location
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
    return colors[rarity] || 'text-gray-400'
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-6">Search</h1>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for creatures or gyms..."
          className="w-full pl-12 pr-4 py-4 bg-surface border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Search Type Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSearchType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            searchType === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface text-gray-300 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSearchType('creatures')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            searchType === 'creatures'
              ? 'bg-primary text-white'
              : 'bg-surface text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Grid3x3 size={16} />
          Creatures
        </button>
        <button
          onClick={() => setSearchType('gyms')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            searchType === 'gyms'
              ? 'bg-primary text-white'
              : 'bg-surface text-gray-300 hover:bg-gray-700'
          }`}
        >
          <MapPin size={16} />
          Gyms
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-400">Searching...</p>
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No results found</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleResultClick(result)}
              className="w-full bg-surface hover:bg-gray-700 rounded-lg p-4 text-left transition-colors"
            >
              {result.type === 'creature' ? (
                <div className="flex items-center gap-4">
                  <div className="text-4xl">
                    {getCreatureEmoji(result.name)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{result.name}</h3>
                    <p className={`text-sm capitalize ${getRarityColor(result.rarity)}`}>
                      {result.rarity}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <MapPin className="text-primary" size={24} />
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{result.name}</h3>
                    {result.description && (
                      <p className="text-gray-400 text-sm">{result.description}</p>
                    )}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {query.length < 2 && (
        <div className="text-center py-12">
          <Search className="mx-auto text-gray-600 mb-4" size={48} />
          <p className="text-gray-400">Start typing to search for creatures or gyms</p>
        </div>
      )}
    </div>
  )
}

