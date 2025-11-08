import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import Map from './components/Map.jsx'
import Collection from './components/Collection.jsx'
import SearchBar from './components/SearchBar.jsx'
import Profile from './components/Profile.jsx'
import Auth from './components/Auth.jsx'
import BottomNav from './components/BottomNav.jsx'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Handle email verification from URL hash (if present)
    // This happens when user clicks verification link in email
    const handleEmailVerification = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        // Password reset flow
        const { data: { session } } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (session) {
          setSession(session)
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      } else if (accessToken && refreshToken) {
        // Email verification or other auth callback
        const { data: { session }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (session) {
          setSession(session)
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } else if (error) {
          console.error('Error setting session from verification link:', error)
        }
      }
    }

    handleEmailVerification()

    // Listen for auth state changes (sign in, sign out, email verification, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session?.user?.email)
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text">Loading WanderBeasts...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <Router>
      <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/collection" element={<CollectionView />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  )
}

function MapView() {
  return (
    <div className="flex-1 relative">
      <Map />
    </div>
  )
}

function CollectionView() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <Collection />
    </div>
  )
}

function SearchView() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <SearchBar />
    </div>
  )
}

function ProfileView() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <Profile />
    </div>
  )
}

export default App

