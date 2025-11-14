/**
 * Google Gemini API integration for AI hunting recommendations
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI = null

/**
 * Initialize Gemini API client
 */
function initGemini() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    console.warn('Gemini API key not found. AI recommendations will be disabled.')
    return null
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey)
  }

  return genAI
}

/**
 * Get AI hunting recommendations based on user context
 * @param {Object} context - User context object
 * @param {number} context.latitude - User latitude
 * @param {number} context.longitude - User longitude
 * @param {string} context.cityName - City name
 * @param {string} context.country - Country code
 * @param {Array} context.nearbyParks - Array of nearby park names
 * @param {Array} context.availableCreatures - Array of available creature types
 * @param {Array} context.recentCatches - Array of recently caught creatures
 * @returns {Promise<Array<string>>} Array of recommendation strings
 */
export async function getHuntingRecommendations(context) {
  try {
    const client = initGemini()
    if (!client) {
      // Return default recommendations if Gemini is not available
      return getDefaultRecommendations(context)
    }

    // Use model from environment variable or fallback to gemini-pro
    // Note: Model availability depends on your API key and region
    // Common models: gemini-pro, gemini-1.5-flash, gemini-1.5-pro
    const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-pro'
    const model = client.getGenerativeModel({ model: modelName })

    const prompt = `You are a helpful guide for a creature-hunting game similar to Pokemon GO.

User Context:
- Current location: ${context.cityName || 'Unknown'}, ${context.country || 'Unknown'}
- Time: ${new Date().toLocaleTimeString()}
- Nearby parks: ${context.nearbyParks?.join(', ') || 'None found'}
- Available creature types in this region: ${context.availableCreatures?.map(c => c.name).join(', ') || 'Various'}
- Recent catches: ${context.recentCatches?.slice(0, 3).map(c => c.name).join(', ') || 'None yet'}

Provide 2-3 SHORT, actionable hunting tips (max 30 words each). Be encouraging and specific about WHERE to go and WHEN. Include emoji.

Format each tip on a new line starting with an emoji.

Example format:
🌊 Head to ${context.nearbyParks?.[0] || 'the park'} before sunset - water creatures love the evening!
🏔️ Mountain types peak at dawn near landmarks
🦌 Forest creatures are most active in green spaces

Be creative and location-specific!`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse tips (split by newlines, filter empty)
    const tips = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('🌊') || line.startsWith('🏔') || line.startsWith('🦌') || line.startsWith('🏙') || line.startsWith('⭐') || line.startsWith('🎯') || line.match(/^[🌊🏔🦌🏙⭐🎯🌳🦅🔥💧]/)))
      .slice(0, 3)

    return tips.length > 0 ? tips : getDefaultRecommendations(context)
  } catch (error) {
    console.error('Error getting AI recommendations:', error)
    return getDefaultRecommendations(context)
  }
}

/**
 * Get default recommendations when AI is unavailable
 * @param {Object} context - User context
 * @returns {Array<string>} Default recommendations
 */
function getDefaultRecommendations(context) {
  const tips = []

  if (context.nearbyParks && context.nearbyParks.length > 0) {
    tips.push(`🌳 Visit ${context.nearbyParks[0]} for boosted spawn rates!`)
  }

  if (context.availableCreatures && context.availableCreatures.length > 0) {
    const rareCreatures = context.availableCreatures.filter(c => ['rare', 'epic', 'legendary'].includes(c.rarity))
    if (rareCreatures.length > 0) {
      tips.push(`⭐ Look for ${rareCreatures[0].name} - they're rare in this area!`)
    }
  }

  tips.push('🎯 Move around to discover more creatures!')

  return tips
}

/**
 * Cache recommendations to avoid excessive API calls
 */
const recommendationCache = new Map()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

/**
 * Get cached recommendations
 * @param {string} locationKey - Cache key based on location
 * @param {Object} context - User context
 * @returns {Promise<Array<string>>}
 */
export async function getCachedRecommendations(locationKey, context) {
  const cached = recommendationCache.get(locationKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.recommendations
  }

  const recommendations = await getHuntingRecommendations(context)
  recommendationCache.set(locationKey, {
    recommendations,
    timestamp: Date.now(),
  })

  return recommendations
}

