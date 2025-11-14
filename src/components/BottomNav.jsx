import { Link, useLocation } from 'react-router-dom'
import { MapPin, Grid3x3, Search, User } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: MapPin, label: 'Map' },
    { path: '/collection', icon: Grid3x3, label: 'Collection' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-center items-end pb-2 safe-area-bottom z-50 px-4 pointer-events-none">
      <div className="bg-surface/95 backdrop-blur-md border border-gray-700/50 rounded-full flex justify-around items-center h-16 px-2 shadow-2xl pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all rounded-full px-3 mx-1 ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-400 hover:text-primary/80 hover:bg-white/5'
              }`}
            >
              <Icon size={22} />
              <span className="text-xs mt-0.5 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

