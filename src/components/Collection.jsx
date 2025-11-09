import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { getCreatureSprite } from '../lib/creatureSprites.js'
import { Star } from 'lucide-react'

export default function Collection() {
  const [catches, setCatches] = useState([])
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, common, uncommon, rare, epic, legendary
  const [sortBy, setSortBy] = useState('date') // date, cp, name, rarity
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const subscriptionRef = useRef(null)

  useEffect(() => {
    fetchCollection()
    fetchPoints()

    // Subscribe to profile updates for real-time points updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      subscriptionRef.current = supabase
        .channel('collection_points')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, 
          (payload) => {
            // Update points when profile is updated
            if (payload.new.points !== undefined) {
              setPoints(payload.new.points)
            }
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
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

  const fetchPoints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setPoints(profile?.points || 0)
    } catch (err) {
      console.error('Error fetching points:', err)
    }
  }


  // Group catches by creature type (only process if we have valid data)
  const groupedCatches = catches.reduce((acc, catchItem) => {
    // Skip invalid catch items
    if (!catchItem || !catchItem.creature_type_id || !catchItem.creature_types) {
      return acc
    }
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
    acc[creatureId].highestCP = Math.max(acc[creatureId].highestCP, catchItem.cp_level || 0)
    return acc
  }, {})

  // Rarity order for sorting
  const rarityOrder = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5
  }

  // Filter and sort
  let filteredCatches = Object.values(groupedCatches)

  if (filter !== 'all') {
    filteredCatches = filteredCatches.filter(
      item => item.creature && item.creature.rarity === filter
    )
  }

  // Apply sorting with defensive checks
  if (filteredCatches.length > 0) {
  if (sortBy === 'cp') {
      filteredCatches.sort((a, b) => {
        const result = (b.highestCP || 0) - (a.highestCP || 0)
        return sortOrder === 'asc' ? -result : result
      })
  } else if (sortBy === 'name') {
      filteredCatches.sort((a, b) => {
        const aName = a.creature?.name || ''
        const bName = b.creature?.name || ''
        const result = aName.localeCompare(bName)
        return sortOrder === 'asc' ? result : -result
      })
    } else if (sortBy === 'rarity') {
      filteredCatches.sort((a, b) => {
        const aRarity = rarityOrder[a.creature?.rarity] || 0
        const bRarity = rarityOrder[b.creature?.rarity] || 0
        const result = bRarity - aRarity
        return sortOrder === 'asc' ? -result : result
      })
  } else {
      // Sort by most recent catch (date)
    filteredCatches.sort((a, b) => {
        if (!a.catches || !a.catches[0] || !b.catches || !b.catches[0]) return 0
      const aDate = new Date(a.catches[0].caught_at)
      const bDate = new Date(b.catches[0].caught_at)
        const result = bDate - aDate
        return sortOrder === 'asc' ? -result : result
    })
    }
  }

  const getRarityColor = (rarity) => {
    const colors = {
      common: 'border-blue-400',
      uncommon: 'border-green-400',
      rare: 'border-purple-400',
      epic: 'border-orange-400',
      legendary: 'legendary-border', // Special class for animated rainbow
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
      <div className="flex items-center justify-center h-full collection-text">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white collection-card-text">Loading collection...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-4 collection-text">
        <p className="text-red-200 mb-2 collection-card-text">Error loading collection</p>
        <p className="text-white text-sm collection-card-text">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto collection-text pb-12 w-full">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
          <div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3 collection-card-text tracking-tight text-shadow-lg">My Collection</h1>
            <p className="text-white/95 text-base md:text-lg collection-card-text font-semibold text-shadow-sm">
              {filteredCatches.length} {filteredCatches.length === 1 ? 'creature' : 'creatures'} collected
            </p>
          </div>
          {/* Points Display */}
          <div className="collection-card rounded-xl p-4 md:p-5 flex items-center gap-3">
            <Star className="text-primary" size={24} />
            <div>
              <p className="text-white/80 text-xs md:text-sm collection-card-text font-semibold uppercase tracking-wider text-shadow-sm">Challenge Points</p>
              <p className="text-2xl md:text-3xl font-extrabold text-white collection-card-text text-shadow-md">{points}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        <div className="collection-card rounded-xl p-6 transition-transform hover:scale-105">
          <p className="text-white/85 text-xs md:text-sm uppercase tracking-wider mb-3 collection-card-text font-bold text-shadow-sm">Total Catches</p>
          <p className="text-4xl md:text-5xl font-extrabold text-white collection-card-text leading-tight text-shadow-lg">{catches.length}</p>
        </div>
        <div className="collection-card rounded-xl p-6 transition-transform hover:scale-105">
          <p className="text-white/75 text-xs md:text-sm uppercase tracking-wider mb-3 collection-card-text font-semibold">Unique Species</p>
          <p className="text-4xl md:text-5xl font-bold text-white collection-card-text leading-tight">{filteredCatches.length}</p>
        </div>
        <div className="collection-card rounded-xl p-6 transition-transform hover:scale-105">
          <p className="text-white/75 text-xs md:text-sm uppercase tracking-wider mb-3 collection-card-text font-semibold">Highest CP</p>
          <p className="text-4xl md:text-5xl font-bold text-white collection-card-text leading-tight">
            {catches.length > 0 ? Math.max(...catches.map(c => c.cp_level)) : 0}
          </p>
        </div>
        <div className="collection-card rounded-xl p-6 transition-transform hover:scale-105">
          <p className="text-white/75 text-xs md:text-sm uppercase tracking-wider mb-3 collection-card-text font-semibold">Completion</p>
          <p className="text-4xl md:text-5xl font-bold text-white collection-card-text leading-tight">
            {filteredCatches.length}/75
          </p>
        </div>
      </div>

      {/* Filters and Sort Section */}
      <div className="collection-card rounded-xl p-5 md:p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-white/90 text-base md:text-lg self-center collection-card-text font-bold mr-1 text-shadow-sm">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm md:text-base transition-all duration-200 collection-card-text text-shadow-sm ${
                filter === 'all'
                  ? 'bg-primary text-white shadow-lg scale-105'
                  : 'collection-card text-white hover:bg-opacity-100 hover:scale-105'
              }`}
            >
              All
            </button>
            {['common', 'uncommon', 'rare', 'epic', 'legendary'].map((rarity) => (
              <button
                key={rarity}
                onClick={() => setFilter(rarity)}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm md:text-base transition-all duration-200 capitalize collection-card-text text-shadow-sm ${
                  filter === rarity
                    ? 'bg-primary text-white shadow-lg scale-105'
                    : 'collection-card text-white hover:bg-opacity-100 hover:scale-105'
                }`}
              >
                {rarity}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-white/90 text-base md:text-lg collection-card-text font-bold text-shadow-sm">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="collection-card border-2 border-white/30 rounded-lg px-5 py-2.5 text-base text-white collection-card-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer font-medium"
            >
              <option value="date" className="bg-surface">Date Caught</option>
              <option value="cp" className="bg-surface">CP Level</option>
              <option value="name" className="bg-surface">Name</option>
              <option value="rarity" className="bg-surface">Rarity</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="collection-card border-2 border-white/30 rounded-lg px-5 py-2.5 text-base text-white collection-card-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer font-medium"
            >
              <option value="desc" className="bg-surface">Descending</option>
              <option value="asc" className="bg-surface">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collection Grid */}
      {filteredCatches.length === 0 ? (
        <div className="text-center py-20 collection-card rounded-xl">
          <div className="text-7xl md:text-8xl mb-6">🐾</div>
          <p className="text-white text-2xl md:text-3xl mb-3 collection-card-text font-bold">No creatures found</p>
          <p className="text-white/80 text-base md:text-lg collection-card-text font-medium">
            {filter === 'all' 
              ? 'Start exploring to catch your first creature!'
              : `No ${filter} creatures in your collection yet.`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 md:gap-6">
          {filteredCatches.map((item) => {
            // Safety check - skip invalid items
            if (!item || !item.creature) {
              return null
            }
            
            const isLegendary = item.creature?.rarity === 'legendary';
            const creatureName = item.creature?.name || 'Unknown';
            const creatureRarity = item.creature?.rarity || 'common';
            
            return (
            <div
              key={item.creature?.id || Math.random()}
              className={`collection-card rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-xl ${getRarityColor(creatureRarity)} ${isLegendary ? 'legendary-card' : 'p-5 md:p-6'}`}
            >
              <div className={isLegendary ? 'p-5 md:p-6 relative z-10' : ''}>
                <div className="text-center mb-5 flex justify-center items-center h-32 md:h-36 bg-white/5 rounded-lg">
                {getCreatureSprite(item.creature) ? (
                  <img 
                    src={getCreatureSprite(item.creature)} 
                    alt={creatureName}
                    className="w-32 h-32 md:w-36 md:h-36 object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      if (e.target) {
                      e.target.style.display = 'none'
                        if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'block'
                        }
                      }
                    }}
                  />
                ) : null}
                <div className="text-8xl md:text-9xl" style={{ display: getCreatureSprite(item.creature) ? 'none' : 'block' }}>
                  {getCreatureEmoji(creatureName)}
                </div>
              </div>
              <h3 className="font-extrabold text-white text-center mb-3 text-lg md:text-xl collection-card-text leading-tight text-shadow-md">
                {creatureName}
              </h3>
              <div className="text-center mb-4">
                <span className={`text-xs md:text-sm px-3 py-1.5 rounded-full capitalize collection-card-text font-bold text-shadow-sm ${
                  creatureRarity === 'common' ? 'bg-secondary/30 text-secondary' :
                  creatureRarity === 'uncommon' ? 'bg-accent/30 text-accent' :
                  creatureRarity === 'rare' ? 'bg-rare/30 text-rare' :
                  creatureRarity === 'epic' ? 'bg-primary/30 text-primary' :
                  'bg-legendary/30 text-legendary'
                }`}>
                  {creatureRarity}
                </span>
              </div>
              <div className="text-center text-sm md:text-base text-white/95 space-y-2 collection-card-text">
                <div className="flex justify-between items-center">
                  <span className="text-white/85 font-semibold text-shadow-sm">Caught:</span>
                  <span className="font-extrabold text-white text-shadow-md">{item.count || 0}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/85 font-semibold text-shadow-sm">Max CP:</span>
                  <span className="font-extrabold text-white text-shadow-md">{item.highestCP || 0}</span>
                </div>
              </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

