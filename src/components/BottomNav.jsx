import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MapPin, Grid3x3, Search, User, Gift, ChevronDown, ChevronUp } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(true) // Start collapsed

  const navItems = [
    { path: '/', icon: MapPin, label: 'Map' },
    { path: '/collection', icon: Grid3x3, label: 'Collection' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/vouchers', icon: Gift, label: 'Vouchers' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 safe-area-bottom">
      {/* Floating pill container - More visible background */}
      <div className={`relative bg-emerald-950/80 backdrop-blur-2xl border-2 border-emerald-400/60 rounded-full shadow-2xl shadow-emerald-500/20 transition-all duration-500 ease-in-out overflow-hidden ${
        isCollapsed 
          ? 'px-3 py-3' 
          : 'px-2 py-2'
      }`}>
        {/* Collapse/Expand button - shown when collapsed */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex items-center justify-center w-full h-full bg-emerald-950/90 backdrop-blur-xl hover:bg-emerald-900/90 transition-all duration-200 rounded-full"
            aria-label="Expand navigation"
          >
            <ChevronUp className="w-5 h-5 text-emerald-200" />
          </button>
        )}

        {/* Navigation items container - icons close together, slides in/out */}
        {!isCollapsed && (
          <>
            {/* Collapse button when expanded */}
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-emerald-950/90 backdrop-blur-xl border-2 border-emerald-400/60 rounded-full p-1.5 hover:bg-emerald-900/90 hover:border-emerald-300/80 transition-all duration-200 shadow-lg z-20"
              aria-label="Collapse navigation"
            >
              <ChevronDown className="w-4 h-4 text-emerald-200" />
            </button>

            <div className="relative flex items-center justify-center gap-0.5 transition-all duration-500 ease-in-out">
              {navItems.map((item, index) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path

        return (
          <Link
            key={item.path}
            to={item.path}
                    className="relative flex flex-col items-center justify-center px-3 py-1.5 transition-all duration-300 group rounded-full"
                  >
                    {/* Active background - rounded pill */}
                    {isActive && (
                      <div className="absolute inset-0 bg-emerald-500/40 rounded-full border border-emerald-300/60 animate-in fade-in duration-300 shadow-lg shadow-emerald-500/30"></div>
                    )}
                    
                    {/* Icon container */}
                    <div className="relative z-10 transition-all duration-300">
                      <Icon 
                        size={isActive ? 24 : 22} 
                        className={`relative z-10 transition-all duration-300 ${
                          isActive 
                            ? 'text-emerald-100 drop-shadow-lg' 
                            : 'text-emerald-200/90 group-hover:text-emerald-100'
                        }`}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </div>
                    
                    {/* Label - smaller, positioned below icon */}
                    <span className={`relative z-10 text-[8px] font-bold transition-all duration-300 leading-tight mt-0.5 ${
                      isActive 
                        ? 'text-emerald-100 font-extrabold drop-shadow-md' 
                        : 'text-emerald-200/80 group-hover:text-emerald-100'
                    }`}>
                      {item.label}
                    </span>
          </Link>
        )
      })}
            </div>
          </>
        )}
      </div>
    </nav>
  )
}

