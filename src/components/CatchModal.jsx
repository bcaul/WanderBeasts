import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { getCreatureSprite } from '../lib/creatureSprites.js'
import { X, Users, Lock } from 'lucide-react'

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

export default function CatchModal({ creature, userLocation, onClose, onCatch, onChallengeUpdate }) {
  console.log('🎬 CatchModal component rendering, creature:', creature?.creature_types?.name, 'creature.id:', creature?.id)
  const [catching, setCatching] = useState(false)
  const [caught, setCaught] = useState(false)
  const [error, setError] = useState(null)
  const [isGymCreature, setIsGymCreature] = useState(false)
  const [playerCount, setPlayerCount] = useState(0)
  const [loadingPlayerCount, setLoadingPlayerCount] = useState(false)
  const [bounceY, setBounceY] = useState(0)
  const animationRef = useRef(null)
  const caughtCreatureIdRef = useRef(null) // Track which creature was caught
  const shouldStartAnimationRef = useRef(false) // Flag to start animation, persists across renders
  
  // Only reset caught state if creature changes AND we haven't caught this new creature yet
  useEffect(() => {
    if (creature?.id) {
      // If creature ID changes and it's NOT the one we caught, reset state
      if (caughtCreatureIdRef.current !== null && caughtCreatureIdRef.current !== creature.id) {
        console.log('🔄 Creature changed from caught one, resetting. Old ID:', caughtCreatureIdRef.current, 'New ID:', creature.id)
        setCaught(false)
        caughtCreatureIdRef.current = null
        shouldStartAnimationRef.current = false
      }
      // If creature matches the one we caught, ensure caught state is true and trigger animation if needed
      else if (caughtCreatureIdRef.current === creature.id) {
        if (!caught) {
          console.log('✅ Restoring caught state for creature:', creature.id)
          setCaught(true)
        }
        // If animation flag is still set, ensure animation runs
        if (shouldStartAnimationRef.current) {
          console.log('🎬 Animation flag still set, will trigger in animation useEffect')
        }
      }
    }
  }, [creature?.id, caught])
  
  useEffect(() => {
    console.log('🔄 CatchModal useEffect - caught:', caught, 'bounceY:', bounceY, 'creature.id:', creature?.id, 'caughtCreatureId:', caughtCreatureIdRef.current, 'shouldStartAnimation:', shouldStartAnimationRef.current)
    
    // Start animation if flag is set and creature matches
    // OR if the caught creature ID matches (even if prop changed, we still want to animate)
    const shouldAnimate = shouldStartAnimationRef.current && caughtCreatureIdRef.current && 
                          (creature?.id === caughtCreatureIdRef.current || !creature?.id)
    
    if (shouldAnimate && caughtCreatureIdRef.current) {
      console.log('✅ Starting animation for caught creature:', caughtCreatureIdRef.current, 'current creature prop:', creature?.id)
      shouldStartAnimationRef.current = false // Reset flag
      setBounceY(0)
      
      // Use a ref to track frame so it persists across renders
      let frame = 0
      const totalFrames = 25 // 25 frames at ~20ms = ~500ms
      
      animationRef.current = setInterval(() => {
        frame++
        const progress = Math.min(frame / totalFrames, 1)
        
        // Simple bounce: 0 -> -8 -> 0 -> -4 -> 0
        let y = 0
        if (progress < 0.25) {
          y = -8 * (progress / 0.25) // 0 to -8
        } else if (progress < 0.5) {
          y = -8 + (8 * ((progress - 0.25) / 0.25)) // -8 to 0
        } else if (progress < 0.75) {
          y = -4 * ((progress - 0.5) / 0.25) // 0 to -4
        } else {
          y = -4 + (4 * ((progress - 0.75) / 0.25)) // -4 to 0
        }
        
        const roundedY = Math.round(y * 10) / 10
        console.log(`📊 Frame ${frame}/${totalFrames}, progress: ${progress.toFixed(2)}, bounceY: ${roundedY}`)
        setBounceY(roundedY)
        
        // Stop when done
        if (frame >= totalFrames) {
          console.log('🏁 Animation complete')
          setBounceY(0)
          if (animationRef.current) {
            clearInterval(animationRef.current)
            animationRef.current = null
          }
        }
      }, 20) // 20ms = 50fps
      
      console.log('⏰ Interval started, animationRef.current:', animationRef.current)
      
      return () => {
        console.log('🧹 Cleaning up animation interval')
        if (animationRef.current) {
          clearInterval(animationRef.current)
          animationRef.current = null
        }
        setBounceY(0)
      }
    } else {
      console.log('❌ Caught is false, resetting bounceY')
      setBounceY(0)
      if (animationRef.current) {
        clearInterval(animationRef.current)
        animationRef.current = null
      }
    }
  }, [caught])
  
  // Log when bounceY changes
  useEffect(() => {
    if (caught && bounceY !== 0) {
      console.log('📍 bounceY updated to:', bounceY)
    }
  }, [bounceY, caught])

  if (!creature || !creature.creature_types) {
    return null
  }

  const creatureType = creature.creature_types

  // Check if this is a gym creature and get player count
  useEffect(() => {
    const checkGymStatus = async () => {
      if (!creature.id) return
      
      try {
        setLoadingPlayerCount(true)
        const { data: spawn, error: spawnError } = await supabase
          .from('spawns')
          .select('gym_id')
          .eq('id', creature.id)
          .single()

        if (!spawnError && spawn && spawn.gym_id) {
          setIsGymCreature(true)
          
          // Get player count at gym
          const { data: count, error: countError } = await supabase.rpc('count_players_at_gym', {
            p_gym_id: spawn.gym_id,
            radius_meters: 100
          })

          if (!countError) {
            setPlayerCount(count || 0)
          }
        }
      } catch (error) {
        console.error('Error checking gym status:', error)
      } finally {
        setLoadingPlayerCount(false)
      }
    }

    checkGymStatus()
    
    // Refresh player count every 10 seconds
    const interval = setInterval(checkGymStatus, 10000)
    return () => clearInterval(interval)
  }, [creature.id])
  
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
    console.log('🎯 handleCatch called, current caught state:', caught)
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
    
    // Allow catching if within 100m
    if (distance > 100) {
      setError(`You are too far away! (${distance.toFixed(0)}m away, need to be within 100m)`)
      return
    }

    setCatching(true)
    setError(null)
    setCaught(false) // Reset caught state immediately

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
        .select('*, gym_id')
        .eq('id', creature.id)
        .single()

      if (spawnError || !spawn) {
        throw new Error('This creature has already been caught or expired!')
      }

      if (new Date(spawn.expires_at) < new Date()) {
        throw new Error('This creature has expired!')
      }

      // If this is a gym creature, check if 5+ players are present
      if (spawn.gym_id) {
        const { data: playerCount, error: countError } = await supabase.rpc('count_players_at_gym', {
          p_gym_id: spawn.gym_id,
          radius_meters: 100
        })

        if (countError) {
          console.error('Error checking player count at gym:', countError)
          // Don't block catch if we can't check, but log the error
        } else if (playerCount < 5) {
          throw new Error(`This epic/legendary creature requires 5+ players at the gym to catch! Currently ${playerCount || 0} players are present. Gather more trainers!`)
        }
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

      // Update collect challenge progress
      try {
        // Get ALL user's active collect challenges
        const { data: allUserChallenges, error: challengesError } = await supabase
          .from('user_challenges')
          .select(`
            *,
            challenges!inner (
              id, 
              name,
              challenge_type, 
              target_creature_type_id, 
              location, 
              radius_meters,
              target_value
            )
          `)
          .eq('user_id', user.id)
          .eq('completed', false)
          .eq('challenges.challenge_type', 'collect')

        if (challengesError) {
          console.error('Error fetching user challenges:', challengesError)
        } else {
          if (!allUserChallenges || allUserChallenges.length === 0) {
            // No active challenges - silently continue
          } else {
            // Filter challenges: either matches this creature type OR accepts any creature (target_creature_type_id is NULL)
            const relevantChallenges = allUserChallenges.filter(uc => {
              const challenge = uc.challenges
              if (!challenge) return false
              
              // Accept if: no specific creature type (any creature) OR matches this creature type
              return challenge.target_creature_type_id === null || 
                     challenge.target_creature_type_id === creatureType.id
            })

            // Update ALL relevant challenges (collect challenges update regardless of distance)
            const updatePromises = []
            
            for (const userChallenge of relevantChallenges) {
              const challenge = userChallenge.challenges
              if (!challenge) continue

              // Create update promise
              const updatePromise = supabase.rpc('update_challenge_progress', {
                p_user_id: user.id,
                p_challenge_id: challenge.id,
                p_progress_increment: 1,
              }).then(async ({ data: updateResult, error: updateError }) => {
                if (updateError) {
                  console.error(`Error updating challenge "${challenge.name}":`, updateError)
                  return { success: false, challengeId: challenge.id, error: updateError }
                } else {
                  if (updateResult === true) {
                    // Check if challenge was completed
                    const { data: updatedChallenge } = await supabase
                      .from('user_challenges')
                      .select('completed, progress_value')
                      .eq('user_id', user.id)
                      .eq('challenge_id', challenge.id)
                      .single()
                    
                    return { success: true, challengeId: challenge.id, completed: updatedChallenge?.completed }
                  } else if (updateResult === false) {
                    return { success: false, challengeId: challenge.id, reason: 'update_returned_false' }
                  } else {
                    return { success: true, challengeId: challenge.id }
                  }
                }
              }).catch(err => {
                console.error(`Exception updating challenge:`, err)
                return { success: false, challengeId: challenge.id, error: err }
              })
              
              updatePromises.push(updatePromise)
            }
            
            // Wait for all updates to complete
            if (updatePromises.length > 0) {
              await Promise.all(updatePromises)
            }
          }
        }
      } catch (error) {
        console.error('Error updating challenge progress:', error)
        // Don't fail the catch if challenge update fails
      }

      console.log('🎣 Setting caught to TRUE! for creature:', creature.id)
      const caughtCreatureId = creature.id
      caughtCreatureIdRef.current = caughtCreatureId // Store which creature was caught
      setCaught(true)
      setCatching(false) // Reset catching state so user can catch again immediately
      
      // Start animation IMMEDIATELY by triggering state update synchronously
      setBounceY(0)
      shouldStartAnimationRef.current = true
      
      // Use requestAnimationFrame to ensure animation starts before parent notification
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Simple, clean bounce animation
          let frame = 0
          const totalFrames = 40 // ~640ms at 16ms intervals
          
          animationRef.current = setInterval(() => {
            frame++
            const progress = Math.min(frame / totalFrames, 1)
            
            // Simple bounce: smooth up and down motion
            // Using sine wave for natural bounce feel
            const bounceHeight = 10 // pixels
            const bounceCount = 1.5 // number of bounces
            const y = -Math.abs(Math.sin(progress * Math.PI * bounceCount)) * bounceHeight
            
            setBounceY(Math.round(y * 10) / 10)
            
            // Apply transform directly to elements
            [spriteRef.current, emojiRef.current].forEach(el => {
              if (el && el.offsetParent !== null) {
                el.style.transform = `translateY(${Math.round(y * 10) / 10}px)`
                el.style.transition = 'none'
              }
            })
            
            if (frame >= totalFrames) {
              setBounceY(0)
              // Reset transform
              [spriteRef.current, emojiRef.current].forEach(el => {
                if (el) {
                  el.style.transform = 'translateY(0px)'
                }
              })
              if (animationRef.current) {
                clearInterval(animationRef.current)
                animationRef.current = null
              }
            }
          }, 16) // ~60fps
          
          console.log('✅ Animation interval started for creature:', caughtCreatureId)
        })
      })
      
      console.log('✅ setCaught(true) called, caughtCreatureIdRef:', caughtCreatureIdRef.current, 'shouldStartAnimation:', shouldStartAnimationRef.current)

      // Delay notifying parent until after animation starts
      setTimeout(() => {
        if (onCatch && caughtCreatureId) {
          console.log('📢 Notifying parent about catch (after animation started)')
          onCatch(caughtCreatureId)
        }
      }, 200) // Delay to let animation start

      // Refresh challenges after a delay to ensure database commit
      setTimeout(() => {
        if (onChallengeUpdate) {
          onChallengeUpdate()
        }
      }, 1000)

      // Close modal after 1.5 seconds (faster so user can catch again sooner)
      setTimeout(() => {
        onClose()
      }, 1500)
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
            <div className="mb-4 flex justify-center">
              {getCreatureSprite(creatureType) ? (
                <img 
                  src={getCreatureSprite(creatureType)} 
                  alt={creatureType.name}
                  className="w-32 h-32 object-contain"
                  style={{
                    transform: `translateY(${bounceY}px) scale(1)`,
                    willChange: caught ? 'transform' : 'auto',
                    transition: 'none' // Manual animation control
                  }}
                  ref={(el) => {
                    if (el && caught) {
                      console.log('🖼️ IMG element ref - transform:', el.style.transform, 'bounceY:', bounceY)
                    }
                  }}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'block'
                  }}
                />
              ) : null}
              <div 
                className="text-8xl"
                style={{
                  display: getCreatureSprite(creatureType) ? 'none' : 'block',
                  transform: `translateY(${bounceY}px) scale(1)`,
                  willChange: caught ? 'transform' : 'auto',
                  transition: 'none' // Manual animation control
                }}
                ref={(el) => {
                  if (el && caught && (!getCreatureSprite(creatureType) || el.style.display !== 'none')) {
                    console.log('😀 EMOJI element ref - transform:', el.style.transform, 'bounceY:', bounceY, 'display:', el.style.display)
                  }
                }}
              >
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

            {/* Gym creature indicator */}
            {isGymCreature && (
              <div className={`mb-4 p-3 rounded-lg border ${
                playerCount >= 5 
                  ? 'bg-green-500/20 border-green-500/50' 
                  : 'bg-yellow-500/20 border-yellow-500/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {playerCount >= 5 ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <Lock size={16} className="text-yellow-400" />
                    )}
                    <span className={`text-sm font-semibold ${
                      playerCount >= 5 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      Gym Creature
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={16} className="text-gray-400" />
                    <span className="text-gray-300">
                      {loadingPlayerCount ? '...' : `${playerCount || 0}/5 players`}
                    </span>
                  </div>
                </div>
                {playerCount < 5 && (
                  <p className="text-xs text-yellow-300 mt-2">
                    Requires 5+ players at the gym to catch. {5 - (playerCount || 0)} more needed!
                  </p>
                )}
                {playerCount >= 5 && (
                  <p className="text-xs text-green-300 mt-2">
                    ✓ Enough players present! You can catch this creature.
                  </p>
                )}
              </div>
            )}

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
                disabled={catching || (isGymCreature && playerCount < 5)}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {catching ? 'Catching...' : isGymCreature && playerCount < 5 ? 'Need 5+ Players' : 'Catch!'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

