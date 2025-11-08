import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Collection() {
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, common, uncommon, rare, epic, legendary
  const [sortBy, setSortBy] = useState('date') // date, cp, name

  useEffect(() => {
    fetchCollection()
  }, [])

  const fetchCollection = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from('catches')
        .select(`
          *,
          creature_types (*)
        `)
        .eq('user_id', user.id)
        .order('caught_at', { ascending: false })

      if (fetchError) throw fetchError

      setCatches(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching collection:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group catches by creature type
  const groupedCatches = catches.reduce((acc, catchItem) => {
    const creatureId = catchItem.creature_type_id
    if (!acc[creatureId]) {
      acc[creatureId] = {
        creature: catchItem.creature_types,
        catches: [],
        count: 0,
        highestCP: 0,
      }
    }
    acc[creatureId].catches.push(catchItem)
    acc[creatureId].count++
    acc[creatureId].highestCP = Math.max(acc[creatureId].highestCP, catchItem.cp_level)
    return acc
  }, {})

  // Filter and sort
  let filteredCatches = Object.values(groupedCatches)

  if (filter !== 'all') {
    filteredCatches = filteredCatches.filter(
      item => item.creature.rarity === filter
    )
  }

  if (sortBy === 'cp') {
    filteredCatches.sort((a, b) => b.highestCP - a.highestCP)
  } else if (sortBy === 'name') {
    filteredCatches.sort((a, b) => a.creature.name.localeCompare(b.creature.name))
  } else {
    // Sort by most recent catch
    filteredCatches.sort((a, b) => {
      const aDate = new Date(a.catches[0].caught_at)
      const bDate = new Date(b.catches[0].caught_at)
      return bDate - aDate
    })
  }

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'bg-secondary/20 border-secondary',
      uncommon: 'bg-accent/20 border-accent',
      rare: 'bg-rare/20 border-rare',
      epic: 'bg-primary/20 border-primary',
      legendary: 'bg-legendary/20 border-legendary',
    }
    return colors[rarity] || colors.common
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading collection...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-400 mb-2">Error loading collection</p>
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-6">My Collection</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Catches</p>
          <p className="text-2xl font-bold text-white">{catches.length}</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="text-gray-400 text-sm">Unique Species</p>
          <p className="text-2xl font-bold text-white">{filteredCatches.length}</p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="text-gray-400 text-sm">Highest CP</p>
          <p className="text-2xl font-bold text-white">
            {catches.length > 0 ? Math.max(...catches.map(c => c.cp_level)) : 0}
          </p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="text-gray-400 text-sm">Completion</p>
          <p className="text-2xl font-bold text-white">
            {filteredCatches.length}/5
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface text-gray-300 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {['common', 'uncommon', 'rare', 'epic', 'legendary'].map((rarity) => (
          <button
            key={rarity}
            onClick={() => setFilter(rarity)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              filter === rarity
                ? 'bg-primary text-white'
                : 'bg-surface text-gray-300 hover:bg-gray-700'
            }`}
          >
            {rarity}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex gap-2 mb-6">
        <label className="text-gray-400 text-sm self-center">Sort by:</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="date">Date Caught</option>
          <option value="cp">CP Level</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Collection Grid */}
      {filteredCatches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-2">No creatures caught yet</p>
          <p className="text-gray-500 text-sm">Start exploring to catch your first creature!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCatches.map((item) => (
            <div
              key={item.creature.id}
              className={`bg-surface rounded-lg p-4 border-2 ${getRarityColor(item.creature.rarity)}`}
            >
              <div className="text-6xl text-center mb-3">
                {getCreatureEmoji(item.creature.name)}
              </div>
              <h3 className="font-bold text-white text-center mb-1">
                {item.creature.name}
              </h3>
              <p className="text-gray-400 text-xs text-center mb-2 capitalize">
                {item.creature.rarity}
              </p>
              <div className="text-center text-sm text-gray-300">
                <p>Caught: {item.count}x</p>
                <p>Highest CP: {item.highestCP}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

