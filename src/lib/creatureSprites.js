/**
 * Utility functions for getting Pokengine creature sprites
 * Source: https://pokengine.org/collections/107s7x9x/Mongratis?icons
 */

/**
 * Get the sprite URL for a creature
 * @param {string} creatureName - The name of the creature
 * @param {string} creatureId - Optional creature ID/code (like "0016spl5")
 * @returns {string} The sprite URL
 */
export function getCreatureSpriteUrl(creatureName, creatureId = null) {
  if (!creatureName && !creatureId) return null
  
  // Pokengine CDN URL pattern: https://pokengine.b-cdn.net/play/images/mons/fronts/{ID}.webp?t=26
  // The ID appears to be a code like "0016spl5" - this may be stored in the database
  // or need to be mapped from the creature name/ID
  
  // If we have a creature ID/code, use it directly
  if (creatureId) {
    return `https://pokengine.b-cdn.net/play/images/mons/fronts/${creatureId}.webp?t=26`
  }
  
  // Otherwise, try to construct from name (may not work - IDs seem to be specific codes)
  // This is a fallback - ideally the database should store the sprite ID
  const normalizedName = creatureName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  
  // Try name-based URL (likely won't work, but worth trying)
  return `https://pokengine.b-cdn.net/play/images/mons/fronts/${normalizedName}.webp?t=26`
}

/**
 * Get sprite URL from creature object (checks image_url first, then generates)
 * @param {object} creature - Creature object with name and optionally image_url or sprite_id
 * @returns {string} The sprite URL or null if invalid/placeholder
 */
export function getCreatureSprite(creature) {
  if (!creature) return null
  
  // If image_url is already set in database, use it (this is the preferred method)
  if (creature.image_url) {
    // Check if URL contains placeholder - if so, it's not valid yet
    if (creature.image_url.includes('{SPRITE_ID}')) {
      // Placeholder URL means sprite ID hasn't been set yet
      return null
    }
    return creature.image_url
  }
  
  // If sprite_id is available (Pokengine-specific ID like "0016spl5"), use it
  if (creature.sprite_id) {
    return getCreatureSpriteUrl(creature.name, creature.sprite_id)
  }
  
  // Otherwise try to generate from name (may not work - Pokengine uses specific IDs)
  // This is a fallback that likely won't work, but we'll try
  if (creature.name) {
    return getCreatureSpriteUrl(creature.name)
  }
  
  return null
}

/**
 * Get creature emoji fallback
 * @param {string} name - Creature name
 * @returns {string} Emoji character
 */
export function getCreatureEmoji(name) {
  // Generic fallback emoji for all creatures
  return '🐾'
}

/**
 * Check if an image URL is valid (for error handling)
 * @param {string} url - Image URL to check
 * @returns {Promise<boolean>} True if image loads successfully
 */
export async function validateImageUrl(url) {
  if (!url) return false
  
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
    // Timeout after 3 seconds
    setTimeout(() => resolve(false), 3000)
  })
}

