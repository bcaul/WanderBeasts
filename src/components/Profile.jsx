import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { LogOut, Trophy, Target, Zap, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const subscriptionRef = useRef(null)

  useEffect(() => {
    fetchProfile()

    // Subscribe to profile updates for real-time points updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      subscriptionRef.current = supabase
        .channel('profile_points')
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
              setProfile(prev => prev ? ({ ...prev, points: payload.new.points }) : null)
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

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Get stats
      const { data: catches } = await supabase
        .from('catches')
        .select('creature_type_id, cp_level, creature_types(rarity)')
        .eq('user_id', user.id)

      // Calculate stats
      const totalCatches = catches?.length || 0
      const uniqueSpecies = new Set(catches?.map(c => c.creature_type_id) || []).size
      const highestCP = catches?.length > 0 ? Math.max(...catches.map(c => c.cp_level)) : 0
      const averageCP = catches?.length > 0
        ? Math.round(catches.reduce((sum, c) => sum + c.cp_level, 0) / catches.length)
        : 0

      // Count by rarity
      const rarityCounts = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
      }

      catches?.forEach(catchItem => {
        const rarity = catchItem.creature_types?.rarity
        if (rarity && rarityCounts.hasOwnProperty(rarity)) {
          rarityCounts[rarity]++
        }
      })

      setProfile(profileData)
      setStats({
        totalCatches,
        uniqueSpecies,
        highestCP,
        averageCP,
        rarityCounts,
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Profile</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-surface hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-surface rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl">
            {profile?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{profile?.username || 'User'}</h2>
            <p className="text-gray-400 text-sm">
              Member since {new Date(profile?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Points Display - Prominent */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="text-white" size={24} />
              <p className="text-white/90 text-sm font-medium">Challenge Points</p>
            </div>
            <p className="text-5xl font-bold text-white">{profile?.points || 0}</p>
            <p className="text-white/70 text-xs mt-1">Earned from completing challenges</p>
          </div>
          <Trophy className="text-white/20" size={48} />
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-primary" size={20} />
                <p className="text-gray-400 text-sm">Total Catches</p>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalCatches}</p>
            </div>

            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-accent" size={20} />
                <p className="text-gray-400 text-sm">Unique Species</p>
              </div>
              <p className="text-3xl font-bold text-white">{stats.uniqueSpecies}</p>
            </div>

            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-legendary" size={20} />
                <p className="text-gray-400 text-sm">Highest CP</p>
              </div>
              <p className="text-3xl font-bold text-white">{stats.highestCP}</p>
            </div>

            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="text-secondary" size={20} />
                <p className="text-gray-400 text-sm">Average CP</p>
              </div>
              <p className="text-3xl font-bold text-white">{stats.averageCP}</p>
            </div>
          </div>

          {/* Rarity Breakdown */}
          <div className="bg-surface rounded-2xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Collection by Rarity</h3>
            <div className="space-y-3">
              {Object.entries(stats.rarityCounts).map(([rarity, count]) => (
                <div key={rarity} className="flex items-center justify-between">
                  <span className="text-gray-300 capitalize">{rarity}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(count / stats.totalCatches) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-white font-bold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completion Progress */}
          <div className="bg-surface rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Collection Progress</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Completion</span>
                  <span className="text-white font-bold">
                    {stats.uniqueSpecies}/50 ({Math.round((stats.uniqueSpecies / 50) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{
                      width: `${(stats.uniqueSpecies / 50) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

