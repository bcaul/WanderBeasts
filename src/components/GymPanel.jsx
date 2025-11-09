import { useState, useEffect } from 'react'
import { useGyms } from '../hooks/useGyms.js'
import { X, MapPin } from 'lucide-react'
import GymCard from './GymCard.jsx'

export default function GymPanel({ latitude, longitude, onClose, selectedGym: initialSelectedGym }) {
  const { gyms, loading } = useGyms(latitude, longitude, 5000)
  const [selectedGym, setSelectedGym] = useState(initialSelectedGym || null)

  // Update selectedGym when initialSelectedGym changes (when clicking a marker)
  useEffect(() => {
    if (initialSelectedGym) {
      setSelectedGym(initialSelectedGym)
    }
  }, [initialSelectedGym?.id])

  // If a gym is selected, show only that gym. Otherwise show all nearby gyms.
  // Also ensure the selected gym is in the gyms list (it might not be if it's far away)
  const displayGyms = selectedGym 
    ? (gyms.find(g => g.id === selectedGym.id) 
        ? gyms.filter(gym => gym.id === selectedGym.id)
        : [selectedGym]) // Show selected gym even if not in nearby list
    : gyms

  // Deduplicate gyms by ID to prevent showing duplicates
  const uniqueGyms = displayGyms.reduce((acc, gym) => {
    if (gym?.id && !acc.find(g => g.id === gym.id)) {
      acc.push(gym)
    }
    return acc
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <MapPin className="text-primary" size={28} />
            {selectedGym ? selectedGym.name : 'Nearby Gyms'}
          </h2>
          <div className="flex items-center gap-2">
            {selectedGym && (
              <button
                onClick={() => setSelectedGym(null)}
                className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1"
              >
                Back to List
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Loading gyms...</p>
          </div>
        ) : uniqueGyms.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400 text-lg mb-2">
              {selectedGym ? 'Gym not found' : 'No gyms nearby'}
            </p>
            <p className="text-gray-500 text-sm">
              {selectedGym ? 'This gym may no longer be available.' : 'Gyms will appear as you explore!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {uniqueGyms.map((gym) => (
              <GymCard
                key={gym.id}
                gym={gym}
                userLatitude={latitude}
                userLongitude={longitude}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
