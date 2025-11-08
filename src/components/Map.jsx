import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useLocation } from '../hooks/useLocation.js'
import { useCreatures } from '../hooks/useCreatures.js'
import { checkIfInParkCached, getNearbyParks } from '../lib/overpass.js'
import { generateSpawns } from '../lib/spawning.js'
import { getCountryCodeCached } from '../lib/geocoding.js'
import { getCreatureSprite } from '../lib/creatureSprites.js'
import CreatureMarker from './CreatureMarker.jsx'
import CatchModal from './CatchModal.jsx'
import AIAssistant from './AIAssistant.jsx'

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
  const [selectedCreature, setSelectedCreature] = useState(null)
  const [inPark, setInPark] = useState(false)
  const [parkName, setParkName] = useState(null)
  const markersRef = useRef([])
  const lastSpawnGenRef = useRef(0)
  const [spawnGenerating, setSpawnGenerating] = useState(false)
  const [spawnDebugInfo, setSpawnDebugInfo] = useState(null)

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 0],
      zoom: 15,
    })

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update map center when location changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !location) return

    map.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 16,
      duration: 1000,
    })

    // Add user location marker
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.style.width = '20px'
    el.style.height = '20px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = '#4ECDC4'
    el.style.border = '3px solid #FFFFFF'
    el.style.boxShadow = '0 0 10px rgba(78, 205, 196, 0.5)'

    // Remove old marker
    if (map.current._userMarker) {
      map.current._userMarker.remove()
    }

    map.current._userMarker = new mapboxgl.Marker(el)
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current)

    // Check if in park
    checkParkStatus(location.latitude, location.longitude)
    
    // Generate spawns immediately on location change (for testing)
    // Then generate every 2 minutes (reduced from 5 for testing)
    const now = Date.now()
    const timeSinceLastSpawn = now - lastSpawnGenRef.current
    
    // Generate immediately if it's been more than 30 seconds, or on first load
    if (timeSinceLastSpawn > 30 * 1000 || lastSpawnGenRef.current === 0) {
      generateSpawnsForLocation(location.latitude, location.longitude)
      lastSpawnGenRef.current = now
    }
  }, [location, mapLoaded])

  // Also generate spawns periodically (every 2 minutes)
  useEffect(() => {
    if (!location) return

    const interval = setInterval(() => {
      generateSpawnsForLocation(location.latitude, location.longitude)
      lastSpawnGenRef.current = Date.now()
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [location])

  // Check park status
  const checkParkStatus = async (lat, lon) => {
    const result = await checkIfInParkCached(lat, lon)
    setInPark(result.inPark)
    setParkName(result.parkName || null)
  }

  // Generate spawns for location
  const generateSpawnsForLocation = async (lat, lon) => {
    if (!lat || !lon) {
      console.warn('Cannot generate spawns: invalid location', { lat, lon })
      return
    }

    setSpawnGenerating(true)
    try {
      console.log('Checking park status and country code...')
      const parkStatus = await checkIfInParkCached(lat, lon)
      const countryCode = await getCountryCodeCached(lat, lon)
      
      console.log('Park status:', parkStatus, 'Country:', countryCode)
      
      const spawnCount = await generateSpawns(lat, lon, 500, parkStatus.inPark, countryCode)
      
      setSpawnDebugInfo({
        generated: spawnCount,
        inPark: parkStatus.inPark,
        countryCode,
        timestamp: new Date().toLocaleTimeString(),
      })
      
      
      // Force refresh creatures list after generating spawns
      // The useCreatures hook will pick this up on its next refresh (10 seconds)
      // But we can also trigger it manually if needed
    } catch (error) {
      console.error('Error generating spawns:', error)
      setSpawnDebugInfo({
        error: error.message,
        timestamp: new Date().toLocaleTimeString(),
      })
    } finally {
      setSpawnGenerating(false)
    }
  }

  // Manual spawn generation (for testing)
  const handleManualSpawn = () => {
    if (location) {
      generateSpawnsForLocation(location.latitude, location.longitude)
    }
  }

  // Update creature markers
  useEffect(() => {
    if (!map.current || !mapLoaded) {
      console.log('Map not ready:', { map: !!map.current, mapLoaded, creatures: creatures?.length })
      return
    }

    if (!creatures || creatures.length === 0) {
      console.log('No creatures to display')
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      return
    }


    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add markers for each creature
    let markersCreated = 0
    let markersSkipped = 0

    creatures.forEach((spawn, index) => {
      if (!spawn.creature_types) {
        console.warn(`Spawn ${index} missing creature_types:`, spawn)
        markersSkipped++
        return
      }

      if (!spawn.location) {
        console.warn(`Spawn ${index} missing location:`, spawn)
        markersSkipped++
        return
      }

      // Try to get coordinates from spawn object first (if query returned them directly)
      let lon, lat
      if (spawn.longitude !== undefined && spawn.latitude !== undefined) {
        lon = parseFloat(spawn.longitude)
        lat = parseFloat(spawn.latitude)
      } else {
        // Fall back to parsing location string/WKB
        const coords = parseLocation(spawn.location)
        if (coords) {
          lon = coords.lon
          lat = coords.lat
        }
      }
      
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        console.warn(`Spawn ${index} invalid coordinates:`, { 
          location: spawn.location, 
          longitude: spawn.longitude,
          latitude: spawn.latitude,
          parsed: [lon, lat] 
        })
        markersSkipped++
        return
      }

      // Verify coordinates are reasonable (not 0,0 or extreme values)
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        console.warn(`Spawn ${index} coordinates out of range:`, { lat, lon })
        markersSkipped++
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

        // Add click event listener (explicit click only, not hover)
        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation() // Prevent map click events
          e.preventDefault() // Prevent default behavior
          // Ensure coordinates are correctly passed - use the parsed values
          setSelectedCreature({
            ...spawn,
            latitude: lat, // Parsed latitude
            longitude: lon, // Parsed longitude
            // Keep original location for reference
            location: spawn.location,
          })
        })

        markersRef.current.push(marker)
        markersCreated++
        
      } catch (error) {
        console.error(`Error creating marker for spawn ${index}:`, error)
        markersSkipped++
      }
    })


    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
    }
  }, [creatures, mapLoaded])

  // Parse WKB hex string to coordinates (same as in spawning.js)
  const parseWKBHex = (hex) => {
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
  }

  // Parse PostGIS geography point
  const parseLocation = (location) => {
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
    
    console.warn('Failed to parse location:', location, typeof location)
    return [null, null]
  }

  // Create marker element
  const createMarkerElement = (creatureType) => {
    const el = document.createElement('div')
    el.className = 'creature-marker'
    
    // Marker size - balanced for visibility and layout
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
    // Don't set position - let Mapbox handle it
    // Mapbox markers are positioned automatically based on setLngLat
    
    // Add creature sprite or emoji fallback
    const spriteUrl = getCreatureSprite(creatureType)
    
    if (spriteUrl && !spriteUrl.includes('{SPRITE_ID}')) {
      // Only use sprite URL if it's valid (no placeholder)
      const img = document.createElement('img')
      img.alt = creatureType.name
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'contain'
      img.style.borderRadius = '50%'
      // Use crisp-edges for pixel art - prevents blur when scaling
      img.style.imageRendering = 'crisp-edges'
      // Fallback for older browsers
      if (!('imageRendering' in img.style)) {
        img.style.imageRendering = '-webkit-optimize-contrast'
      }
      img.loading = 'eager' // Load immediately
      
      // Set error handler FIRST (before src)
      let errorHandled = false
      img.onerror = (e) => {
        if (errorHandled) return // Prevent multiple error handlers
        errorHandled = true
        const emoji = getCreatureEmoji(creatureType.name)
        el.innerHTML = `<span style="font-size: 22px; line-height: 1; display: block;">${emoji}</span>`
      }
      
      // Add to DOM and set src
      el.appendChild(img)
      img.src = spriteUrl
    } else {
      // Fallback to emoji if no valid sprite URL
      const emoji = getCreatureEmoji(creatureType.name)
      el.innerHTML = `<span style="font-size: 22px; line-height: 1; display: block;">${emoji}</span>`
    }
    
    // Add subtle hover effect (visual only, no action)
    // CRITICAL: Keep border size constant (3px) to prevent position shifts
    // Changing border size changes element dimensions, causing Mapbox to reposition
    el.addEventListener('mouseenter', (e) => {
      e.stopPropagation()
      // Only change shadow - keep border at 3px (same size)
      el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.8), 0 0 0 4px rgba(255,255,255,0.6)'
      // Keep border at 3px - don't change size!
      // Use outline for additional visual feedback without affecting size
      el.style.outline = '2px solid rgba(255,255,255,0.5)'
      el.style.outlineOffset = '-2px'
    })
    el.addEventListener('mouseleave', (e) => {
      e.stopPropagation()
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
      common: '#4ECDC4',
      uncommon: '#FFE66D',
      rare: '#A569BD',
      epic: '#FF6B6B',
      legendary: '#F39C12',
    }
    return colors[rarity] || colors.common
  }

  // Get creature emoji (fallback if sprite fails to load)
  const getCreatureEmoji = (name) => {
    // Generic fallback emoji for all creatures
    return '🐾'
  }

  const handleCloseModal = useCallback(() => {
    setSelectedCreature(null)
  }, [])

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
    <div className="relative w-full h-full" style={{ position: 'relative', zIndex: 1 }}>
      <div ref={mapContainer} className="w-full h-full" style={{ position: 'relative', zIndex: 1 }} />

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

      {/* Spawn generation status */}
      {spawnGenerating && (
        <div className="absolute top-16 right-4 bg-surface/90 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          Generating spawns...
        </div>
      )}

      {/* Debug info and manual spawn button (for testing) */}
      {location && (
        <div className="absolute bottom-24 right-4 bg-surface/90 text-white px-4 py-2 rounded-lg shadow-lg z-10 max-w-xs" style={{ zIndex: 10 }}>
          <div className="text-xs mb-2 space-y-1">
            <div className="font-bold">Creatures nearby: {creatures?.length || 0}</div>
            <div className="text-gray-400">
              Markers created: {markersRef.current.length}
            </div>
            {spawnDebugInfo && (
              <div className="mt-1 text-gray-400">
                <div>Last spawn: {spawnDebugInfo.generated || 0} generated</div>
                {spawnDebugInfo.inPark && (
                  <div className="text-green-400">🌳 In park (boosted)</div>
                )}
                {spawnDebugInfo.countryCode && (
                  <div>Country: {spawnDebugInfo.countryCode}</div>
                )}
                {spawnDebugInfo.error && (
                  <div className="text-red-400">Error: {spawnDebugInfo.error}</div>
                )}
              </div>
            )}
            {creatures && creatures.length > 0 && (
              <div className="mt-2 text-gray-300">
                <div className="font-semibold mb-1">Creatures:</div>
                {creatures.slice(0, 3).map((c, i) => (
                  <div key={i} className="text-xs">
                    {c.creature_types?.name || 'Unknown'} ({c.creature_types?.rarity || '?'})
                  </div>
                ))}
                {creatures.length > 3 && (
                  <div className="text-xs text-gray-500">+{creatures.length - 3} more</div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleManualSpawn}
            disabled={spawnGenerating}
            className="w-full bg-primary hover:bg-primary/90 text-white text-xs py-1 px-2 rounded transition-colors disabled:opacity-50"
          >
            {spawnGenerating ? 'Generating...' : 'Generate Spawns'}
          </button>
        </div>
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
        />
      )}
    </div>
  )
}

