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
    <nav className="bg-surface border-t border-gray-700 flex justify-around items-center h-16 px-4 safe-area-bottom relative z-50">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              isActive ? 'text-primary' : 'text-gray-400'
            } hover:text-primary/80`}
          >
            <Icon size={24} />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

