import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        // Validate username is provided
        if (!username || username.trim() === '') {
          throw new Error('Username is required')
        }

        // Check if username is already taken (optional check)
        const { data: existingUsers, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .limit(1)

        // If check succeeds and finds a user, username is taken
        if (!checkError && existingUsers && existingUsers.length > 0) {
          throw new Error('This username is already taken. Please choose a different one.')
        }

        // Sign up with username in metadata (trigger will create profile)
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
            },
          },
        })

        if (authError) {
          // Provide more specific error messages
          if (authError.message.includes('User already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.')
          }
          if (authError.message.includes('Password')) {
            throw new Error('Password must be at least 6 characters long.')
          }
          if (authError.message.includes('Email')) {
            throw new Error('Please enter a valid email address.')
          }
          throw authError
        }

        if (data.user) {
          // Wait a moment for the trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 500))

          // Verify profile was created by trigger
          const { data: profile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', data.user.id)
            .single()

          if (!profile && !profileCheckError) {
            // Profile not created by trigger, try manual creation as fallback
            const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              username: username.trim(),
            })

            if (profileError) {
              // If still fails, it might be a duplicate (trigger created it in the meantime)
              if (!profileError.message.includes('duplicate') && !profileError.message.includes('unique')) {
                console.error('Failed to create profile:', profileError)
                throw new Error('Account created but profile setup failed. Please contact support.')
              }
            }
          }

          // Check if email confirmation is required
          if (data.user && !data.user.email_confirmed_at) {
            setMessage('Account created! Please check your email and click the verification link to activate your account.')
          } else {
            setMessage('Account created successfully! You can now sign in.')
          }
        } else {
          throw new Error('Failed to create account. Please try again.')
        }
      } else {
        // Sign in
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (authError) {
          // Provide more specific error messages
          if (authError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.')
          } else if (authError.message.includes('Email not confirmed')) {
            throw new Error('Please verify your email address. Check your inbox for the verification link.')
          } else if (authError.message.includes('User not found')) {
            throw new Error('No account found with this email. Please sign up first.')
          }
          throw authError
        }

        // Check if email is verified (optional - you can allow unverified users)
        if (data.user && !data.user.email_confirmed_at) {
          // User is signed in but email not verified
          // You can either:
          // 1. Allow them in (for development)
          // 2. Show a message asking them to verify
          console.warn('User email not verified:', data.user.email)
          // For now, we'll allow them in but you can add a check here
        }
      }
    } catch (err) {
      // Provide more helpful error messages
      let errorMessage = err.message
      
      if (err.message?.includes('duplicate key') || err.message?.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Try signing in instead.'
      } else if (err.message?.includes('Database error')) {
        errorMessage = 'Database error. Please check that the migration was run correctly. See TROUBLESHOOTING_SIGNUP_ERROR.md for help.'
      } else if (err.message?.includes('username')) {
        errorMessage = 'This username is already taken. Please choose a different one.'
      } else if (err.message?.includes('password')) {
        errorMessage = 'Password must be at least 6 characters long.'
      } else if (err.message?.includes('email')) {
        errorMessage = 'Please enter a valid email address.'
      }
      
      setError(errorMessage)
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">WanderBeasts</h1>
          <p className="text-gray-400">Catch creatures on your adventures</p>
        </div>

        <div className="bg-surface rounded-2xl p-6 shadow-xl">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                !isSignUp
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                isSignUp
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Choose a username"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          By continuing, you agree to catch creatures responsibly 🎮
        </p>
      </div>
    </div>
  )
}

