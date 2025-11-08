// This component is now integrated into Map.jsx
// Keeping this file for potential future use as a separate component

export default function CreatureMarker({ creature, onClick }) {
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
      onClick={onClick}
      className="creature-marker cursor-pointer"
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: getRarityColor(creature.rarity),
        border: '3px solid #FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{ fontSize: '20px' }}>{getCreatureEmoji(creature.name)}</span>
    </div>
  )
}

