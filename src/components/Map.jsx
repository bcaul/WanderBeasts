import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { useLocation } from '../hooks/useLocation.js'
import { useCreatures } from '../hooks/useCreatures.js'
import { checkIfInParkCached, getNearbyParks } from '../lib/overpass.js'
import { generateSpawns } from '../lib/spawning.js'
import { getCountryCodeCached } from '../lib/geocoding.js'
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
      console.log('Generating spawns for location:', location.latitude, location.longitude)
      generateSpawnsForLocation(location.latitude, location.longitude)
      lastSpawnGenRef.current = now
    }
  }, [location, mapLoaded])

  // Also generate spawns periodically (every 2 minutes)
  useEffect(() => {
    if (!location) return

    const interval = setInterval(() => {
      console.log('Periodic spawn generation triggered')
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
      
      console.log(`Spawn generation complete. Generated ${spawnCount} spawns.`)
      
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
      console.log('Manual spawn generation triggered')
      generateSpawnsForLocation(location.latitude, location.longitude)
    }
  }

  // Update creature markers
  useEffect(() => {
    if (!map.current || !mapLoaded || !creatures) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add markers for each creature
    creatures.forEach((spawn) => {
      if (!spawn.creature_types || !spawn.location) return

      const [lon, lat] = parseLocation(spawn.location)
      if (!lat || !lon) return

      const marker = new mapboxgl.Marker({
        element: createMarkerElement(spawn.creature_types),
      })
        .setLngLat([lon, lat])
        .addTo(map.current)

      marker.getElement().addEventListener('click', () => {
        setSelectedCreature({
          ...spawn,
          latitude: lat,
          longitude: lon,
        })
      })

      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
    }
  }, [creatures, mapLoaded])

  // Parse PostGIS geography point
  const parseLocation = (location) => {
    if (typeof location === 'string') {
      // Format: "POINT(lon lat)" or "SRID=4326;POINT(lon lat)"
      const match = location.match(/POINT\(([^)]+)\)/)
      if (match) {
        const coords = match[1].trim().split(/\s+/)
        if (coords.length >= 2) {
          return [parseFloat(coords[0]), parseFloat(coords[1])]
        }
      }
    }
    // Handle case where location might be an object with coordinates
    if (location && typeof location === 'object' && location.coordinates) {
      return [location.coordinates[0], location.coordinates[1]]
    }
    return [null, null]
  }

  // Create marker element
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
    
    // Add creature emoji or image
    const emoji = getCreatureEmoji(creatureType.name)
    el.innerHTML = `<span style="font-size: 20px;">${emoji}</span>`
    
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

  // Get creature emoji (fallback until images are added)
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
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

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
        <div className="absolute bottom-24 right-4 bg-surface/90 text-white px-4 py-2 rounded-lg shadow-lg z-10 max-w-xs">
          <div className="text-xs mb-2">
            <div>Creatures nearby: {creatures?.length || 0}</div>
            {spawnDebugInfo && (
              <div className="mt-1 text-gray-400">
                Last spawn: {spawnDebugInfo.generated || 0} generated
                {spawnDebugInfo.error && (
                  <div className="text-red-400">Error: {spawnDebugInfo.error}</div>
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

