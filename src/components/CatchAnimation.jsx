import { useEffect, useRef } from 'react'
import { getCreatureSprite, getCreatureEmoji } from '../lib/creatureSprites.js'

// Catch animation - SIMPLE and GUARANTEED to work
export default function CatchAnimation({ creatureType }) {
  const elementRef = useRef(null)

  useEffect(() => {
    // Force animation by manipulating the element directly
    const el = elementRef.current
    if (!el) {
      console.warn('CatchAnimation: elementRef.current is null')
      return
    }

    console.log('🎬 CATCH ANIMATION STARTING!', creatureType?.name)

    // Start animation from initial state
    el.style.transform = 'scale(0.1) translateY(80px)'
    el.style.opacity = '0'
    el.style.transition = 'none'

    // Force reflow to ensure initial state is applied
    void el.offsetWidth

    // Animate using requestAnimationFrame for smooth animation
    const startTime = performance.now()
    const duration = 800

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      if (progress < 0.3) {
        // Pop in - dramatic entrance
        const p = progress / 0.3
        const scale = 0.1 + (1.6 - 0.1) * p
        const y = 80 - (90 * p)
        const opacity = p
        if (el) {
          el.style.transform = `scale(${scale}) translateY(${y}px)`
          el.style.opacity = opacity.toString()
        }
      } else if (progress < 0.6) {
        // Bounce down
        const p = (progress - 0.3) / 0.3
        const scale = 1.6 - (0.6 * p)
        const y = -10 + (20 * p)
        if (el) {
          el.style.transform = `scale(${scale}) translateY(${y}px)`
          el.style.opacity = '1'
        }
      } else {
        // Bounce up and settle
        const p = (progress - 0.6) / 0.4
        const scale = 1.0 + (0.2 * Math.sin(p * Math.PI))
        const y = 10 - (10 * p)
        if (el) {
          el.style.transform = `scale(${scale}) translateY(${y}px)`
          el.style.opacity = '1'
        }
      }

      if (progress < 1 && el) {
        requestAnimationFrame(animate)
      } else if (el) {
        // Final state
        el.style.transform = 'scale(1) translateY(0px)'
        el.style.opacity = '1'
      }
    }

    // Start animation immediately
    requestAnimationFrame(animate)
  }, [creatureType])

  return (
    <div
      ref={elementRef}
      style={{
        display: 'inline-block',
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
    >
      {getCreatureSprite(creatureType) ? (
        <img
          src={getCreatureSprite(creatureType)}
          alt={creatureType.name}
          className="w-32 h-32 object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.target.style.display = 'none'
            if (e.target.nextSibling) {
              e.target.nextSibling.style.display = 'block'
            }
          }}
        />
      ) : null}
      <div
        className="text-8xl"
        style={{
          display: getCreatureSprite(creatureType) ? 'none' : 'block'
        }}
      >
        {getCreatureEmoji(creatureType.name)}
      </div>
    </div>
  )
}

