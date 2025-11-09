import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useChallenges } from '../hooks/useChallenges.js'
import { X, MapPin, Target, Trophy, TrendingUp } from 'lucide-react'

export default function ChallengePanel({ latitude, longitude, onClose, onChallengeAccept, selectedChallenge: initialSelectedChallenge }) {
  const { challenges, loading, refetch: refetchChallenges } = useChallenges(latitude, longitude)
  const [selectedChallenge, setSelectedChallenge] = useState(initialSelectedChallenge || null)
  const [accepting, setAccepting] = useState(false)

  // Update selected challenge when prop changes
  useEffect(() => {
    if (initialSelectedChallenge) {
      setSelectedChallenge(initialSelectedChallenge)
    }
  }, [initialSelectedChallenge])

  const handleAcceptChallenge = async (challenge) => {
    try {
      setAccepting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please sign in to accept challenges')
        return
      }

      const { error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challenge.id,
          progress_value: 0,
          completed: false,
        })

      if (error) {
        if (error.code === '23505') {
          alert('You have already accepted this challenge!')
        } else {
          console.error('Error accepting challenge:', error)
          alert('Failed to accept challenge. Please try again.')
        }
        return
      }

      if (onChallengeAccept) {
        onChallengeAccept(challenge)
      }

      // Refresh challenges to get updated progress
      if (refetchChallenges) {
        setTimeout(() => {
          refetchChallenges()
        }, 500)
      }

      // Update selected challenge to show accepted state
      setSelectedChallenge({ ...challenge, accepted: true, progress_value: 0 })
    } catch (error) {
      console.error('Error accepting challenge:', error)
      alert('Failed to accept challenge. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  const getChallengeIcon = (type) => {
    switch (type) {
      case 'collect':
        return '🎯'
      case 'walk':
        return '🚶'
      case 'explore':
        return '🗺️'
      default:
        return '📋'
    }
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400'
      case 'medium':
        return 'text-yellow-400'
      case 'hard':
        return 'text-orange-400'
      case 'expert':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
  }

  // Find challenge in list if selectedChallenge is provided
  const displayChallenges = selectedChallenge && !challenges.find(c => c.id === selectedChallenge.id)
    ? [selectedChallenge, ...challenges]
    : challenges

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Target className="text-primary" size={28} />
            Nearby Challenges
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Loading challenges...</p>
          </div>
        ) : displayChallenges.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400 text-lg mb-2">No challenges nearby</p>
            <p className="text-gray-500 text-sm">Explore new areas to find challenges!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className={`bg-surface border-2 rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
                  challenge.completed ? 'border-green-500/50 bg-green-500/10' :
                  challenge.accepted ? 'border-primary/50' : 'border-gray-700'
                }`}
                onClick={() => setSelectedChallenge(challenge)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getChallengeIcon(challenge.challenge_type)}</span>
                      <h3 className="text-lg font-bold text-white">{challenge.name}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${getDifficultyColor(challenge.difficulty)} bg-current/20`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{challenge.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {challenge.park_id && (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          <span>{challenge.park_id}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span>📍</span>
                        <span>{formatDistance(challenge.distance_meters || 0)} away</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy size={14} />
                        <span>{challenge.reward_points} pts</span>
                      </div>
                    </div>

                    {challenge.accepted && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">Progress</span>
                          <span className="text-xs font-semibold text-primary">
                            {challenge.progress_value || 0} / {challenge.target_value}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(((challenge.progress_value || 0) / challenge.target_value) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {challenge.completed && (
                    <div className="ml-4 text-green-400">
                      <Trophy size={24} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Challenge Detail Modal */}
        {selectedChallenge && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedChallenge(null)}>
            <div
              className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{selectedChallenge.name}</h3>
                <button
                  onClick={() => setSelectedChallenge(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 mb-2">{selectedChallenge.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded ${getDifficultyColor(selectedChallenge.difficulty)} bg-current/20`}>
                      {selectedChallenge.difficulty}
                    </span>
                    <span>•</span>
                    <span>{formatDistance(selectedChallenge.distance_meters || 0)} away</span>
                    <span>•</span>
                    <span>{selectedChallenge.reward_points} points</span>
                  </div>
                </div>

                <div className="bg-surface/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Target</span>
                    <span className="text-sm font-semibold text-white">
                      {selectedChallenge.target_value}
                      {selectedChallenge.challenge_type === 'walk' ? ' meters' :
                       selectedChallenge.challenge_type === 'collect' ? ' creatures' : ''}
                    </span>
                  </div>
                  {selectedChallenge.accepted && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Progress</span>
                        <span className="text-xs font-semibold text-primary">
                          {selectedChallenge.progress_value || 0} / {selectedChallenge.target_value}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(((selectedChallenge.progress_value || 0) / selectedChallenge.target_value) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {!selectedChallenge.accepted && !selectedChallenge.completed && (
                  <button
                    onClick={() => handleAcceptChallenge(selectedChallenge)}
                    disabled={accepting}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {accepting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <Target size={18} />
                        Accept Challenge
                      </>
                    )}
                  </button>
                )}

                {selectedChallenge.accepted && !selectedChallenge.completed && (
                  <div className="bg-primary/20 border border-primary/50 rounded-lg p-3 text-center">
                    <p className="text-primary text-sm font-semibold">Challenge Accepted!</p>
                    <p className="text-gray-400 text-xs mt-1">Complete it to earn {selectedChallenge.reward_points} points</p>
                  </div>
                )}

                {selectedChallenge.completed && (
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Trophy className="text-green-400" size={20} />
                      <p className="text-green-400 text-sm font-semibold">Challenge Completed!</p>
                    </div>
                    <p className="text-gray-400 text-xs">You earned {selectedChallenge.reward_points} points</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

