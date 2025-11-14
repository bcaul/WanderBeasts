import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useLocation } from '../hooks/useLocation.js'
import { useLocationTracking } from '../hooks/useLocationTracking.js'
import { useCreatures } from '../hooks/useCreatures.js'
import { useChallenges } from '../hooks/useChallenges.js'
import { useGyms } from '../hooks/useGyms.js'
import { useGymTracking } from '../hooks/useGymTracking.js'
import { checkIfInParkCached } from '../lib/overpass.js'
import { generateSpawns } from '../lib/spawning.js'
import { generateChallengesNearParks, generateChallengesAtLocation } from '../lib/generateChallenges.js'
import { getCountryCodeCached } from '../lib/geocoding.js'
import { getCreatureSprite } from '../lib/creatureSprites.js'
import { Target, MapPin, Navigation } from 'lucide-react'
import CatchModal from './CatchModal.jsx'
import AIAssistant from './AIAssistant.jsx'
import ChallengePanel from './ChallengePanel.jsx'
import GymPanel from './GymPanel.jsx'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

export default function Map() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const { location, error: locationError } = useLocation()
  const { creatures, loading: creaturesLoading } = useCreatures(
    location?.latitude,
    location?.longitude
  )
  const { challenges, loading: challengesLoading, refetch: refetchChallenges } = useChallenges(
    location?.latitude,
    location?.longitude
  )
  const { gyms } = useGyms(
    location?.latitude,
    location?.longitude,
    5000
  )
  
  // Track location for walking challenges
  useLocationTracking(location)
  
  // Track player at gyms for epic/legendary creature spawning
  useGymTracking(location, gyms)
  
  const [selectedCreature, setSelectedCreature] = useState(null)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [selectedGym, setSelectedGym] = useState(null)
  const [inPark, setInPark] = useState(false)
  const [parkName, setParkName] = useState(null)
  const [caughtCreatureIds, setCaughtCreatureIds] = useState(new Set())
  const markersRef = useRef([])
  const challengeMarkersRef = useRef([])
  const gymMarkersRef = useRef([])
  const lastSpawnGenRef = useRef(0)
  const [spawnGenerating, setSpawnGenerating] = useState(false)
  const [showChallengePanel, setShowChallengePanel] = useState(false)
  const [showGymPanel, setShowGymPanel] = useState(false)
  const [generatingChallenges, setGeneratingChallenges] = useState(false)
  const lastChallengeGenRef = useRef(0)
  const styleLoadTimeoutRef = useRef(null)

  // Function to center map on user location
  const centerOnUserLocation = useCallback(() => {
    if (!map.current || !location || !mapLoaded) return
    
    map.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 16,
      duration: 1000,
      essential: true, // This animation is considered essential with respect to prefers-reduced-motion
    })
  }, [location, mapLoaded])

  useEffect(() => {
    if (map.current || !mapContainer.current) {
      console.log('Map initialization skipped:', { hasMap: !!map.current, hasContainer: !!mapContainer.current })
      return
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN
    
    console.log('Map initialization check:', { 
      hasToken: !!token, 
      tokenLength: token?.length || 0,
      containerExists: !!mapContainer.current,
      containerWidth: mapContainer.current?.offsetWidth,
      containerHeight: mapContainer.current?.offsetHeight
    })
    
    if (!token) {
      console.error('❌ Mapbox token is missing! Please set VITE_MAPBOX_TOKEN in your .env file')
      return
    }

    // Wait a tick to ensure container has dimensions
    const initTimer = setTimeout(() => {
      if (!mapContainer.current) {
        console.error('Map container is null after timeout')
        return
      }

      // Use Tara's custom style with fallback to default if 404
      const fallbackStyle = 'mapbox://styles/mapbox/dark-v11'
      const customStyle = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/bcaul/cmhyxw5hg00l801qu1iqz4798'
      const mapboxStyle = customStyle
      
      let hasFallenBack = false
      
      try {
        console.log('🗺️ Initializing map with style:', mapboxStyle)
        console.log('📦 Container size:', {
          width: mapContainer.current.offsetWidth,
          height: mapContainer.current.offsetHeight
        })
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: mapboxStyle,
          center: [0, 0],
          zoom: 15,
          attributionControl: false,
        })

        map.current.on('load', () => {
          if (styleLoadTimeoutRef.current) {
            clearTimeout(styleLoadTimeoutRef.current)
            styleLoadTimeoutRef.current = null
          }
          // Log the actual loaded style
          const currentStyle = map.current.getStyle()
          const styleName = currentStyle?.name || mapboxStyle
          console.log('✅ Map loaded successfully!')
          console.log('📌 Requested style:', mapboxStyle)
          console.log('📌 Actual loaded style:', styleName)
          console.log('📌 Style metadata:', {
            name: styleName,
            version: currentStyle?.version,
            owner: currentStyle?.owner || 'unknown'
          })
          setMapLoaded(true)
        })

        map.current.on('error', (e) => {
          const errorObj = e.error || {}
          const errorMsg = (errorObj.message || errorObj.toString() || '').toLowerCase()
          const errorUrl = errorObj.url || ''
          
          // If we get a 404 for the style URL, fall back to default
          if (!hasFallenBack && (errorMsg.includes('404') || errorMsg.includes('not found')) && 
              errorUrl.includes('styles/v1')) {
            console.warn('⚠️ Style not found (404) - Tara\'s style may be private or deleted')
            console.log('🔄 Falling back to default Mapbox dark style...')
            hasFallenBack = true
            try {
              map.current.setStyle(fallbackStyle)
              console.log('✅ Fallback style applied')
            } catch (fallbackError) {
              console.error('❌ Failed to load fallback style:', fallbackError)
            }
          } else if (!errorMsg.includes('404') && !errorMsg.includes('not found')) {
            console.error('❌ Mapbox error:', e)
          }
        })

        // Listen for style loading events
        map.current.on('style.load', () => {
          if (styleLoadTimeoutRef.current) {
            clearTimeout(styleLoadTimeoutRef.current)
            styleLoadTimeoutRef.current = null
          }
          const currentStyle = map.current.getStyle()
          const styleName = currentStyle?.name || 'Unknown'
          console.log('✅ Map style loaded successfully!')
          console.log('📌 Style name:', styleName)
          console.log('📌 Style metadata:', {
            version: currentStyle?.version,
            owner: currentStyle?.owner,
            id: currentStyle?.id
          })
          if (!mapLoaded) {
            setMapLoaded(true)
          }
        })

        map.current.on('styleimagemissing', () => {
          console.warn('⚠️ Map style image missing')
        })

        map.current.on('data', (e) => {
          if (e.dataType === 'style' && e.isSourceLoaded === false) {
            console.warn('⚠️ Style data loading issue')
          }
        })

        map.current.on('data', () => {
          console.log('📊 Map data event')
        })
      } catch (error) {
        console.error('❌ Error initializing map:', error)
      }
    }, 100)

    return () => {
      clearTimeout(initTimer)
      if (styleLoadTimeoutRef.current) {
        clearTimeout(styleLoadTimeoutRef.current)
        styleLoadTimeoutRef.current = null
      }
      if (map.current) {
        console.log('🧹 Cleaning up map')
        map.current.remove()
        map.current = null
        setMapLoaded(false)
      }
    }
  }, [])

  const createUserLocationMarker = useCallback((heading) => {
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.style.width = '32px'
    el.style.height = '32px'
    el.style.position = 'relative'
    el.style.display = 'flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
    el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
    
    const arrowSVG = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="transform-origin: 16px 16px;">
        <circle cx="16" cy="16" r="15" fill="#4ECDC4" stroke="#FFFFFF" stroke-width="2.5" opacity="0.95"/>
        <rect x="14" y="8" width="4" height="12" fill="#FFFFFF" rx="1"/>
        <path d="M 16 4 L 10 12 L 16 10 L 22 12 Z" 
              fill="#FFFFFF" 
              stroke="#1A1A2E" 
              stroke-width="0.3"
              stroke-linejoin="round"/>
      </svg>
    `
    el.innerHTML = arrowSVG
    const svgElement = el.querySelector('svg')
    
    const headingDegrees = heading !== null && heading !== undefined && !isNaN(heading) ? heading : 0
    svgElement.style.transform = `rotate(${headingDegrees}deg)`
    svgElement.style.transition = 'transform 0.5s ease-out'
    
    return el
  }, [])

  useEffect(() => {
    if (!map.current || !mapLoaded || !location) return

    if (!map.current._userMarker) {
      const markerElement = createUserLocationMarker(location.heading || 0)
      map.current._userMarker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current)
    } else {
      map.current._userMarker.setLngLat([location.longitude, location.latitude])
      const headingDegrees = location.heading !== null && location.heading !== undefined && !isNaN(location.heading) 
        ? location.heading 
        : 0
      const markerElement = map.current._userMarker.getElement()
      const svgElement = markerElement?.querySelector('svg')
      if (svgElement) {
        svgElement.style.transform = `rotate(${headingDegrees}deg)`
      }
    }

    const currentCenter = map.current.getCenter()
    const distance = Math.sqrt(
      Math.pow(currentCenter.lng - location.longitude, 2) + 
      Math.pow(currentCenter.lat - location.latitude, 2)
    )
    
    if (distance > 0.0005) {
      map.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 16,
        duration: 1000,
      })
    }

    checkParkStatus(location.latitude, location.longitude)
    
    const now = Date.now()
    const timeSinceLastSpawn = now - lastSpawnGenRef.current
    
    if (timeSinceLastSpawn > 30 * 1000 || lastSpawnGenRef.current === 0) {
      generateSpawnsForLocation(location.latitude, location.longitude)
      lastSpawnGenRef.current = now
    }
  }, [location, mapLoaded, createUserLocationMarker])

  // Also generate spawns periodically (every 2 minutes)
  useEffect(() => {
    if (!location) return

    const interval = setInterval(() => {
      generateSpawnsForLocation(location.latitude, location.longitude)
      lastSpawnGenRef.current = Date.now()
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [location])

  const checkParkStatus = async (lat, lon) => {
    const result = await checkIfInParkCached(lat, lon)
    setInPark(result.inPark)
    setParkName(result.parkName || null)
  }

  const generateSpawnsForLocation = async (lat, lon) => {
    if (!lat || !lon) {
      console.warn('Cannot generate spawns: invalid location', { lat, lon })
      return
    }

    setSpawnGenerating(true)
    try {
      const parkStatus = await checkIfInParkCached(lat, lon)
      const countryCode = await getCountryCodeCached(lat, lon)
      await generateSpawns(lat, lon, 500, parkStatus.inPark, countryCode)
    } catch (error) {
      console.error('Error generating spawns:', error)
    } finally {
      setSpawnGenerating(false)
    }
  }


  // Parse WKB hex string to coordinates (same as in spawning.js)
  const parseWKBHex = useCallback((hex) => {
    try {
      if (!hex || typeof hex !== 'string' || hex.length < 42) {
        return null
      }
      
      // WKB Extended format with SRID
      // Skip: 2 (endian) + 8 (type) + 8 (SRID) = 18 hex chars
      const xHex = hex.substring(18, 34) // Longitude (8 bytes)
      const yHex = hex.substring(34, 50) // Latitude (8 bytes)
      
      // Convert hex to Float64 (little endian)
      const parseDouble = (hexStr) => {
        const buffer = new ArrayBuffer(8)
        const view = new DataView(buffer)
        for (let i = 0; i < 8; i++) {
          view.setUint8(i, parseInt(hexStr.substr(i * 2, 2), 16))
        }
        return view.getFloat64(0, true)
      }
      
      const lon = parseDouble(xHex)
      const lat = parseDouble(yHex)
      
      if (isNaN(lon) || isNaN(lat) || !isFinite(lon) || !isFinite(lat)) {
        return null
      }
      
      return [lon, lat]
    } catch (error) {
      console.error('Error parsing WKB hex:', error)
      return null
    }
  }, [])

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
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
  }, [])

  // Parse PostGIS geography point
  const parseLocation = useCallback((location) => {
    // Handle WKB hex format (starts with "0101")
    if (typeof location === 'string' && location.startsWith('0101')) {
      const coords = parseWKBHex(location)
      if (coords) return coords
    }
    
    // Handle WKT string format: "POINT(lon lat)" or "SRID=4326;POINT(lon lat)"
    if (typeof location === 'string') {
      // Try to match POINT format
      const match = location.match(/POINT\(([^)]+)\)/)
      if (match) {
        const coords = match[1].trim().split(/\s+/)
        if (coords.length >= 2) {
          const lon = parseFloat(coords[0])
          const lat = parseFloat(coords[1])
          if (!isNaN(lon) && !isNaN(lat)) {
            return [lon, lat]
          }
        }
      }
      // Try to parse as WKT without POINT wrapper
      const wktMatch = location.match(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/)
      if (wktMatch) {
        const lon = parseFloat(wktMatch[1])
        const lat = parseFloat(wktMatch[2])
        if (!isNaN(lon) && !isNaN(lat)) {
          return [lon, lat]
        }
      }
    }
    
    // Handle object format from Supabase
    if (location && typeof location === 'object') {
      // Check for coordinates array [lon, lat]
      if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
        return [parseFloat(location.coordinates[0]), parseFloat(location.coordinates[1])]
      }
      // Check for x/y properties (lon/lat)
      if (location.x !== undefined && location.y !== undefined) {
        return [parseFloat(location.x), parseFloat(location.y)]
      }
      // Check for lon/lat properties
      if (location.lon !== undefined && location.lat !== undefined) {
        return [parseFloat(location.lon), parseFloat(location.lat)]
      }
      // Check for lng/lat properties (common in some APIs)
      if (location.lng !== undefined && location.lat !== undefined) {
        return [parseFloat(location.lng), parseFloat(location.lat)]
      }
    }
    
    return null
  }, [parseWKBHex])

  useEffect(() => {
    if (!map.current || !mapLoaded) return

    if (!creatures || creatures.length === 0) {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      return
    }

    // Filter out caught creatures, gym spawns, and spawns too close to player
    const MIN_SPAWN_DISTANCE = 25 // Minimum distance in meters (prevent spawns on player icon)
    const availableCreatures = creatures.filter(spawn => {
      // Skip gym spawns - they're displayed on the gym marker itself
      if (spawn.gym_id) {
        return false
      }
      
      // Skip if already caught
      if (caughtCreatureIds.has(spawn.id)) {
        return false
      }
      
      // Skip if missing required data
      if (!spawn.creature_types || !spawn.location) {
        return false
      }
      
      // Skip if too close to player (prevent spawns on/too close to player icon)
      if (location) {
        // Get spawn coordinates
        let spawnLat, spawnLon
        if (spawn.latitude !== undefined && spawn.longitude !== undefined) {
          spawnLat = parseFloat(spawn.latitude)
          spawnLon = parseFloat(spawn.longitude)
        } else if (spawn.location) {
          // Parse from location if coordinates not directly available
          const coords = parseLocation(spawn.location)
          if (coords && Array.isArray(coords) && coords.length >= 2) {
            spawnLon = coords[0]
            spawnLat = coords[1]
          }
        }
        
        if (spawnLat !== undefined && spawnLon !== undefined && !isNaN(spawnLat) && !isNaN(spawnLon)) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            spawnLat,
            spawnLon
          )
          if (distance < MIN_SPAWN_DISTANCE) {
            return false
          }
        }
      }
      
      return true
    })

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add markers for each creature
    availableCreatures.forEach((spawn, index) => {
      if (!spawn.creature_types) {
        return
      }

      let lon, lat
      if (spawn.longitude !== undefined && spawn.latitude !== undefined) {
        lon = parseFloat(spawn.longitude)
        lat = parseFloat(spawn.latitude)
      } else {
        const coords = parseLocation(spawn.location)
        if (coords && Array.isArray(coords) && coords.length >= 2) {
          lon = coords[0]
          lat = coords[1]
        } else if (coords && coords.lon !== undefined && coords.lat !== undefined) {
          lon = coords.lon
          lat = coords.lat
        }
      }
      
      if (!lat || !lon || isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return
      }

      try {
        const markerElement = createMarkerElement(spawn.creature_types)
        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: 'center',
        })
          .setLngLat([lon, lat])
          .addTo(map.current)

        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation()
          e.preventDefault()
          if (!caughtCreatureIds.has(spawn.id)) {
            setSelectedCreature({
              ...spawn,
              latitude: lat,
              longitude: lon,
              location: spawn.location,
            })
          }
        })

        markersRef.current.push(marker)
      } catch (error) {
        console.error(`Error creating marker for spawn ${index}:`, error)
      }
    })
  }, [creatures, mapLoaded, caughtCreatureIds, location, parseLocation])

  const createMarkerElement = (creatureType) => {
    const el = document.createElement('div')
    el.className = 'creature-marker'
    
    el.style.width = '40px'
    el.style.height = '40px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = getRarityColor(creatureType.rarity)
    el.style.border = '3px solid #FFFFFF'
    el.style.display = 'flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
    el.style.cursor = 'pointer'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
    
    // Try to load sprite, fallback to pawprint emoji
    const spriteUrl = getCreatureSprite(creatureType)
    
    if (spriteUrl && !spriteUrl.includes('{SPRITE_ID}')) {
      const img = document.createElement('img')
      img.alt = creatureType.name
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'contain'
      img.style.borderRadius = '50%'
      img.style.imageRendering = 'crisp-edges'
      if (!('imageRendering' in img.style)) {
        img.style.imageRendering = '-webkit-optimize-contrast'
      }
      img.loading = 'eager'
      img.referrerPolicy = 'no-referrer'
      
      // Set error handler FIRST (before src)
      let errorHandled = false
      img.onerror = () => {
        if (errorHandled) return // Prevent multiple error handlers
        errorHandled = true
        // Fallback to pawprint emoji if sprite fails to load
        el.innerHTML = `<span style="font-size: 22px; line-height: 1; display: block;">🐾</span>`
      }
      
      // Add to DOM and set src
      el.appendChild(img)
      img.src = spriteUrl
    } else {
      // Fallback to pawprint emoji if no valid sprite URL
      el.innerHTML = `<span style="font-size: 22px; line-height: 1; display: block;">🐾</span>`
    }
    
    // Add subtle hover effect (visual only, no action)
    // CRITICAL: Keep border size constant (3px) to prevent position shifts
    // Changing border size changes element dimensions, causing Mapbox to reposition
    el.addEventListener('mouseenter', () => {
      // Only change shadow - keep border at 3px (same size)
      el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.8), 0 0 0 4px rgba(255,255,255,0.6)'
      // Keep border at 3px - don't change size!
      // Use outline for additional visual feedback without affecting size
      el.style.outline = '2px solid rgba(255,255,255,0.5)'
      el.style.outlineOffset = '-2px'
    })
    el.addEventListener('mouseleave', () => {
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
      el.style.outline = 'none'
      el.style.outlineOffset = '0'
    })
    
    // Add title for accessibility
    el.title = `Click to catch ${creatureType.name} (${creatureType.rarity})`
    
    return el
  }

  // Get rarity color
  const getRarityColor = (rarity) => {
    const colors = {
      common: '#aabda0',
      uncommon: '#beccc0',
      rare: '#7e9278',
      epic: '#6e7864',
      legendary: '#8b7355',
    }
    return colors[rarity] || colors.common
  }

  // Generate challenges near parks
  const generateChallengesForLocation = useCallback(async (lat, lon) => {
    if (Date.now() - lastChallengeGenRef.current < 5 * 60 * 1000) {
      return
    }

    try {
      setGeneratingChallenges(true)
      lastChallengeGenRef.current = Date.now()

      const challengesCreated = await generateChallengesNearParks(lat, lon, 5000)
      if (challengesCreated === 0) {
        await generateChallengesAtLocation(lat, lon, 8)
      }
    } catch (error) {
      console.error('Error generating challenges:', error)
    } finally {
      setGeneratingChallenges(false)
    }
  }, [])

  useEffect(() => {
    if (!location || !mapLoaded || challengesLoading || generatingChallenges) return

    if (challenges && challenges.length === 0) {
      if (lastChallengeGenRef.current === 0) {
        const timer = setTimeout(() => {
          generateChallengesForLocation(location.latitude, location.longitude)
        }, 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [location, challenges, mapLoaded, challengesLoading, generatingChallenges, generateChallengesForLocation])

  // Challenge markers disabled - use Challenges button to access
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    challengeMarkersRef.current.forEach(marker => {
      try { marker.remove() } catch (e) {
        // Ignore errors during cleanup
      }
    })
    challengeMarkersRef.current = []
  }, [])

  // Create RSVP badge marker (separate marker to avoid positioning issues)
  const createGymBadgeMarker = (rsvpCount) => {
    const badgeEl = document.createElement('div')
    badgeEl.className = 'gym-rsvp-badge-marker'
    badgeEl.textContent = rsvpCount > 99 ? '99+' : rsvpCount.toString()
    
    badgeEl.style.minWidth = '20px'
    badgeEl.style.height = '20px'
    badgeEl.style.borderRadius = '10px'
    badgeEl.style.backgroundColor = '#5B9BD5'
    badgeEl.style.border = '2px solid #FFFFFF'
    badgeEl.style.padding = '0 5px'
    badgeEl.style.fontSize = '11px'
    badgeEl.style.fontWeight = 'bold'
    badgeEl.style.color = '#FFFFFF'
    badgeEl.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.5)'
    badgeEl.style.display = 'flex'
    badgeEl.style.alignItems = 'center'
    badgeEl.style.justifyContent = 'center'
    badgeEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    badgeEl.style.lineHeight = '1'
    badgeEl.style.pointerEvents = 'none'
    badgeEl.style.whiteSpace = 'nowrap'
    badgeEl.style.zIndex = '1001'
    
    return badgeEl
  }
  
  // Calculate badge offset coordinates (15m northeast of gym)
  const calculateBadgeOffset = (latitude, longitude, offsetMeters = 15) => {
    const latOffset = offsetMeters / 111000
    const lonOffset = offsetMeters / (111000 * Math.cos(latitude * Math.PI / 180))
    return [longitude + lonOffset, latitude + latOffset]
  }

  // Create gym marker element
  const createGymMarker = async (gym) => {
    const el = document.createElement('div')
    el.className = 'gym-marker'
    
    el.style.width = '44px'
    el.style.height = '44px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = '#4A5568'
    el.style.border = '3px solid #5B9BD5'
    el.style.display = 'flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
    el.style.cursor = 'pointer'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
    
    // Get creatures at this gym
    const { getGymSpawns } = await import('../lib/gymSpawning.js')
    const gymSpawns = await getGymSpawns(gym.id)
    const firstCreature = gymSpawns && gymSpawns.length > 0 ? gymSpawns[0].creature_types : null
    
    // Set background color
    const bgColor = firstCreature ? getRarityColor(firstCreature.rarity) : '#4A5568'
    el.style.backgroundColor = bgColor
    
    const rsvpCount = gym.rsvp_count || 0
    
    if (rsvpCount > 0) {
      el.setAttribute('data-rsvp-count', rsvpCount.toString())
    }
    
    if (rsvpCount >= 5) {
      el.style.borderColor = '#4A90E2'
      el.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.5), 0 0 0 2px rgba(74, 144, 226, 0.2)'
    }
    
    // Add creature sprite or pawprint emoji fallback
    if (firstCreature) {
      const spriteUrl = getCreatureSprite(firstCreature)
      if (spriteUrl && !spriteUrl.includes('{SPRITE_ID}')) {
        const img = document.createElement('img')
        img.alt = firstCreature.name
        img.style.width = '100%'
        img.style.height = '100%'
        img.style.objectFit = 'contain'
        img.style.borderRadius = '50%'
        img.style.imageRendering = 'crisp-edges'
        img.loading = 'eager'
        img.referrerPolicy = 'no-referrer'
        
        let errorHandled = false
        img.onerror = () => {
          if (errorHandled) return
          errorHandled = true
          // Fallback to pawprint emoji if sprite fails
          el.innerHTML = '<span style="font-size: 20px; line-height: 1; display: block;">🐾</span>'
        }
        
        el.appendChild(img)
        img.src = spriteUrl
      } else {
        // Fallback to pawprint emoji if no valid sprite
        el.innerHTML = '<span style="font-size: 20px; line-height: 1; display: block;">🐾</span>'
      }
    } else {
      // No creature yet, show simple gym icon
      el.innerHTML = '<span style="font-size: 20px; line-height: 1; display: block;">🏋️</span>'
    }
    
    // Add hover effect
    el.addEventListener('mouseenter', () => {
      el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.8), 0 0 0 4px rgba(91, 155, 213, 0.6)'
      el.style.outline = '2px solid rgba(91, 155, 213, 0.5)'
      el.style.outlineOffset = '-2px'
    })
    el.addEventListener('mouseleave', () => {
      const shadow = rsvpCount >= 5 
        ? '0 2px 8px rgba(74, 144, 226, 0.5), 0 0 0 2px rgba(74, 144, 226, 0.2)'
        : '0 2px 8px rgba(0,0,0,0.3)'
      el.style.boxShadow = shadow
      el.style.outline = 'none'
      el.style.outlineOffset = '0'
    })
    
    el.title = `${gym.name} - ${rsvpCount} RSVPs${firstCreature ? ` - ${firstCreature.name}` : ''}`
    
    return el
  }

  const isUpdatingMarkersRef = useRef(false)
  const gymMarkersMapRef = useRef({})
  const gymBadgeMarkersMapRef = useRef({})

  // Update gym markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return
    if (isUpdatingMarkersRef.current) return

    isUpdatingMarkersRef.current = true

    // Create a stable set of gyms to process
    if (!gyms || gyms.length === 0) {
      // Clear all markers if no gyms (including badge markers)
      Object.values(gymMarkersMapRef.current).forEach((marker) => {
        try {
          marker.remove()
        } catch (e) {
          // Ignore errors
        }
      })
      Object.values(gymBadgeMarkersMapRef.current).forEach((badgeMarker) => {
        try {
          badgeMarker.remove()
        } catch (e) {
          // Ignore errors
        }
      })
      gymMarkersMapRef.current = {}
      gymBadgeMarkersMapRef.current = {}
      gymMarkersRef.current = []
      isUpdatingMarkersRef.current = false
      return
    }

    // Deduplicate by ID and location
    const gymIdsProcessed = {}
    const locationKeyMap = {}
    const uniqueGyms = []
    
    for (const gym of gyms) {
      if (!gym?.id) continue
      
      const lat = parseFloat(gym.latitude)
      const lon = parseFloat(gym.longitude)
      if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
        continue
      }
      
      const locationKey = `${lat.toFixed(6)},${lon.toFixed(6)}`
      if (gymIdsProcessed[gym.id] || locationKeyMap[locationKey]) {
        continue
      }
      
      gymIdsProcessed[gym.id] = true
      locationKeyMap[locationKey] = true
      uniqueGyms.push({ ...gym, latitude: lat, longitude: lon })
    }


    // Process markers: Update existing, add new, remove old
    const processMarkers = async () => {
      try {
        const currentGymIds = new Set(uniqueGyms.map(g => g.id))
        const markersToRemove = []

        // Remove markers for gyms that no longer exist
        Object.keys(gymMarkersMapRef.current).forEach((gymId) => {
          if (!currentGymIds.has(gymId)) {
            const marker = gymMarkersMapRef.current[gymId]
            try {
              marker.remove()
              markersToRemove.push(gymId)
            } catch (e) {
              // Ignore errors during marker removal
            }
            
            const badgeMarker = gymBadgeMarkersMapRef.current[gymId]
            if (badgeMarker) {
              try {
                badgeMarker.remove()
              } catch (e) {
                // Ignore errors during badge marker removal
              }
              delete gymBadgeMarkersMapRef.current[gymId]
            }
          }
        })

        markersToRemove.forEach(id => {
          delete gymMarkersMapRef.current[id]
          const index = gymMarkersRef.current.findIndex(m => m._gymId === id)
          if (index >= 0) {
            gymMarkersRef.current.splice(index, 1)
          }
        })

        // Create/update markers for each unique gym
        for (const gym of uniqueGyms) {
          const rsvpCount = gym.rsvp_count || 0
          
          if (gymMarkersMapRef.current[gym.id]) {
            const existingMarker = gymMarkersMapRef.current[gym.id]
            const markerElement = existingMarker.getElement()
            
            if (rsvpCount >= 5) {
              markerElement.style.borderColor = '#4A90E2'
              markerElement.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.5), 0 0 0 2px rgba(74, 144, 226, 0.2)'
            } else {
              markerElement.style.borderColor = '#5B9BD5'
              markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
            }
            
            markerElement.title = `${gym.name} - ${rsvpCount} RSVPs`
            
            // Update badge marker
            if (rsvpCount > 0) {
              const existingBadgeMarker = gymBadgeMarkersMapRef.current[gym.id]
              
              if (existingBadgeMarker) {
                const badgeElement = existingBadgeMarker.getElement()
                badgeElement.textContent = rsvpCount > 99 ? '99+' : rsvpCount.toString()
              } else {
                const badgeEl = createGymBadgeMarker(rsvpCount)
                const [badgeLon, badgeLat] = calculateBadgeOffset(gym.latitude, gym.longitude)
                
                const badgeMarker = new mapboxgl.Marker({
                  element: badgeEl,
                  anchor: 'center',
                  draggable: false
                })
                  .setLngLat([badgeLon, badgeLat])
                  .addTo(map.current)
                
                gymBadgeMarkersMapRef.current[gym.id] = badgeMarker
              }
            } else {
              const existingBadgeMarker = gymBadgeMarkersMapRef.current[gym.id]
              if (existingBadgeMarker) {
                try {
                  existingBadgeMarker.remove()
                } catch (e) {
                  // Ignore errors during badge marker removal
                }
                delete gymBadgeMarkersMapRef.current[gym.id]
              }
            }
            
            continue
          }

          try {
            const gymMarkerEl = await createGymMarker(gym)
            gymMarkerEl.dataset.gymId = gym.id
            
            const marker = new mapboxgl.Marker({
              element: gymMarkerEl,
              anchor: 'center',
              draggable: false
            })
              .setLngLat([gym.longitude, gym.latitude])
              .addTo(map.current)
            
            marker._gymId = gym.id

            gymMarkerEl.addEventListener('click', (e) => {
              e.stopPropagation()
              e.preventDefault()
              setSelectedGym(gym)
              setShowGymPanel(true)
            })

            gymMarkersMapRef.current[gym.id] = marker
            gymMarkersRef.current.push(marker)
            
            // Create badge marker if RSVP count > 0
            const rsvpCount = gym.rsvp_count || 0
            if (rsvpCount > 0) {
              const badgeEl = createGymBadgeMarker(rsvpCount)
              const [badgeLon, badgeLat] = calculateBadgeOffset(gym.latitude, gym.longitude)
              
              const badgeMarker = new mapboxgl.Marker({
                element: badgeEl,
                anchor: 'center',
                draggable: false
              })
                .setLngLat([badgeLon, badgeLat])
                .addTo(map.current)
              
              gymBadgeMarkersMapRef.current[gym.id] = badgeMarker
            }
          } catch (error) {
            console.error('Error creating gym marker:', error, gym.name)
          }
        }
      } finally {
        isUpdatingMarkersRef.current = false
      }
    }

    processMarkers()
  }, [gyms, mapLoaded])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const markersMap = gymMarkersMapRef.current
      const badgeMarkersMap = gymBadgeMarkersMapRef.current
      
      Object.values(markersMap).forEach(marker => {
        try { marker.remove() } catch (e) {
          // Ignore errors during cleanup
        }
      })
      
      Object.values(badgeMarkersMap).forEach(badgeMarker => {
        try { badgeMarker.remove() } catch (e) {
          // Ignore errors during cleanup
        }
      })
      
      gymMarkersMapRef.current = {}
      gymBadgeMarkersMapRef.current = {}
      gymMarkersRef.current = []
    }
  }, [])

  // Update selected challenge progress when challenges refresh (separate effect to avoid loops)
  useEffect(() => {
    if (!selectedChallenge || !challenges || challenges.length === 0) return
    
    const updatedChallenge = challenges.find(c => c.id === selectedChallenge.id)
    if (updatedChallenge && (
      updatedChallenge.progress_value !== selectedChallenge.progress_value || 
      updatedChallenge.completed !== selectedChallenge.completed
    )) {
      console.log(`📊 Updating selected challenge progress: ${updatedChallenge.progress_value}/${updatedChallenge.target_value} (was ${selectedChallenge.progress_value}/${selectedChallenge.target_value})`)
      setSelectedChallenge(updatedChallenge)
    }
  }, [challenges]) // Only depend on challenges array

  const handleCloseModal = useCallback(() => {
    setSelectedCreature(null)
  }, [])

  const handleCreatureCaught = useCallback((creatureId) => {
    // Add to caught set to immediately remove from map
    setCaughtCreatureIds(prev => new Set([...prev, creatureId]))
    // Close the modal
    setSelectedCreature(null)
  }, [])

  const handleChallengeUpdate = useCallback(() => {
    // Refresh challenges immediately after a catch to update progress
    console.log('🔄 Refreshing challenges after catch...')
    if (refetchChallenges) {
      // Add a small delay to ensure database has updated
      setTimeout(async () => {
        await refetchChallenges()
        console.log('✅ Challenges refreshed')
        
        // Update selected challenge if it exists to show new progress
        if (selectedChallenge) {
          // Find the updated challenge in the refreshed list
          setTimeout(() => {
            // This will be handled by the challenges update effect
          }, 100)
        }
      }, 500)
    }
  }, [refetchChallenges, selectedChallenge])

  if (!mapboxgl.accessToken) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center p-4">
          <p className="text-red-400 mb-2">Mapbox token not configured</p>
          <p className="text-gray-400 text-sm">Please add VITE_MAPBOX_TOKEN to your .env file</p>
        </div>
      </div>
    )
  }

  if (locationError) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center p-4">
          <p className="text-red-400 mb-2">{locationError}</p>
          <p className="text-gray-400 text-sm">Please enable location permissions</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="absolute inset-0 w-full h-full" 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: '100%', 
        height: '100%',
        backgroundColor: '#1a1a1a',
        zIndex: 1
      }}
    >
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full" 
        style={{ 
          position: 'absolute', 
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%', 
          height: '100%',
          backgroundColor: '#1a1a1a',
          zIndex: 1
        }} 
      />
      
      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading map...</p>
            {!import.meta.env.VITE_MAPBOX_TOKEN && (
              <p className="text-red-400 text-sm mt-2">⚠️ Mapbox token not found. Check your .env file.</p>
            )}
          </div>
        </div>
      )}

      {/* Park boost indicator */}
      {inPark && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-full shadow-lg z-10">
          🌳 {parkName || 'Park'} - Boosted Spawns!
        </div>
      )}

      {/* Loading indicator */}
      {creaturesLoading && (
        <div className="absolute top-4 right-4 bg-surface/90 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          Searching for creatures...
        </div>
      )}

      {/* Challenge generation status */}
      {generatingChallenges && (
        <div className="absolute top-16 right-4 bg-surface/90 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          Generating challenges...
        </div>
      )}

      {/* Spawn generation status */}
      {spawnGenerating && (
        <div className="absolute top-28 right-4 bg-surface/90 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          Generating spawns...
        </div>
      )}

      {/* Challenges Button - Left side of map */}
      <button
        className="absolute bottom-32 left-4 bg-primary hover:bg-primary/90 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
        style={{ zIndex: 1050 }}
        onClick={() => setShowChallengePanel(true)}
        title="View Challenges"
        aria-label="View nearby challenges"
      >
        <Target size={20} />
        {challenges && challenges.length > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
            {challenges.filter(c => !c.completed).length}
          </span>
        )}
      </button>

      {/* Gyms Button - Left side of map */}
      <button
        className="absolute bottom-48 left-4 bg-primary hover:bg-primary/90 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
        style={{ zIndex: 1050 }}
        onClick={() => setShowGymPanel(true)}
        title="View Gyms"
        aria-label="View nearby gyms"
      >
        <MapPin size={20} />
        {gyms && gyms.length > 0 && (
          <span className="bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5">
            {gyms.length}
          </span>
        )}
      </button>

      {/* My Location Button - Bottom left, under Challenges button */}
      {location && mapLoaded && (
        <button
          className="absolute bottom-16 left-4 bg-primary hover:bg-primary/90 text-white p-3 rounded-full shadow-lg flex items-center gap-2"
          style={{ zIndex: 1050 }}
          onClick={centerOnUserLocation}
          title="Center map on your location"
          aria-label="Center map on your location"
        >
          <Navigation size={20} />
        </button>
      )}

      {/* AI Assistant */}
      {location && (
        <AIAssistant
          latitude={location.latitude}
          longitude={location.longitude}
          inPark={inPark}
          parkName={parkName}
        />
      )}

      {/* Catch Modal */}
      {selectedCreature && (
        <CatchModal
          creature={selectedCreature}
          userLocation={location}
          onClose={handleCloseModal}
          onCatch={handleCreatureCaught}
          onChallengeUpdate={handleChallengeUpdate}
        />
      )}

      {/* Challenge Panel */}
      {showChallengePanel && location && (
        <ChallengePanel
          latitude={location.latitude}
          longitude={location.longitude}
          selectedChallenge={selectedChallenge}
          onClose={() => {
            setShowChallengePanel(false)
            setSelectedChallenge(null)
          }}
          onChallengeAccept={() => {
            setSelectedChallenge(null)
            // Refresh challenges - the useChallenges hook will refetch automatically
          }}
        />
      )}

      {/* Gym Panel */}
      {showGymPanel && location && (
        <GymPanel
          latitude={location.latitude}
          longitude={location.longitude}
          selectedGym={selectedGym}
          onClose={() => {
            setShowGymPanel(false)
            setSelectedGym(null)
          }}
        />
      )}
    </div>
  )
}

