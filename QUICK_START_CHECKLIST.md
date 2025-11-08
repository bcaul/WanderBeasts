# Quick Start Checklist

Use this checklist to quickly set up WanderBeasts. Check off each item as you complete it.

## Prerequisites
- [ ] Node.js installed (v18 or higher)
- [ ] npm installed (comes with Node.js)
- [ ] Code editor installed (VS Code recommended)
- [ ] Internet connection

## Step 1: Install Dependencies
- [ ] Open terminal/command prompt
- [ ] Navigate to project folder: `cd C:\Users\bcaul\Pokemon_Gone`
- [ ] Run: `npm install`
- [ ] Wait for installation to complete (1-5 minutes)
- [ ] Verify `node_modules/` folder exists

## Step 2: Set Up Supabase
- [ ] Create account at https://supabase.com
- [ ] Create new project
- [ ] Wait for project to be ready (1-2 minutes)
- [ ] Go to Project Settings → API
- [ ] Copy Project URL
- [ ] Copy anon public key
- [ ] Go to Database → Extensions
- [ ] Enable PostGIS extension
- [ ] Go to SQL Editor
- [ ] Open `supabase/migrations/001_initial_schema.sql`
- [ ] Copy entire file contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify success (no errors)
- [ ] Go to Table Editor
- [ ] Verify tables exist (profiles, creature_types, spawns, catches, gyms, rsvps, ai_tips)
- [ ] Verify creature_types has 5 rows (seeded data)

## Step 3: Get Mapbox Token
- [ ] Create account at https://mapbox.com
- [ ] Go to Account → Access Tokens
- [ ] Copy default public token (starts with `pk.`)

## Step 4: Get Google Gemini API Key
- [ ] Go to https://makersuite.google.com/app/apikey
- [ ] Sign in with Google account
- [ ] Click "Create API Key"
- [ ] Copy API key (starts with `AIza`)

## Step 5: Configure Environment Variables
- [ ] Create `.env` file in project root
- [ ] Add `VITE_SUPABASE_URL=` (paste your Supabase URL)
- [ ] Add `VITE_SUPABASE_ANON_KEY=` (paste your anon key)
- [ ] Add `VITE_MAPBOX_TOKEN=` (paste your Mapbox token)
- [ ] Add `VITE_GEMINI_API_KEY=` (paste your Gemini key)
- [ ] Verify no spaces around `=` signs
- [ ] Verify file is saved as `.env` (not `.env.txt`)

## Step 6: Test the Application
- [ ] Run: `npm run dev`
- [ ] Open browser: `http://localhost:5173`
- [ ] Allow location access when prompted
- [ ] Create an account (sign up)
- [ ] Sign in
- [ ] Verify map loads and centers on your location
- [ ] Wait for creatures to spawn (may take a few minutes)
- [ ] Click on a creature marker
- [ ] Catch a creature
- [ ] Navigate to Collection tab
- [ ] Verify caught creature appears
- [ ] Navigate to Search tab
- [ ] Test search functionality
- [ ] Navigate to Profile tab
- [ ] Verify stats are displayed

## Step 7: Deploy to Production (Optional)
- [ ] Push code to GitHub
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Import project from GitHub
- [ ] Add environment variables in Vercel dashboard
- [ ] Deploy
- [ ] Update Supabase redirect URLs with Vercel URL
- [ ] Test production app
- [ ] Test on mobile device

## Troubleshooting
If something doesn't work:
- [ ] Check browser console for errors
- [ ] Check Supabase logs for database errors
- [ ] Verify all environment variables are set correctly
- [ ] Verify PostGIS extension is enabled
- [ ] Verify migration ran successfully
- [ ] Restart dev server after changing `.env` file
- [ ] Check detailed setup guide: `DETAILED_SETUP_GUIDE.md`

## Success Criteria
Your app is working if:
- [ ] You can sign up and sign in
- [ ] Map shows your location
- [ ] Creatures appear on the map
- [ ] You can catch creatures
- [ ] Caught creatures appear in collection
- [ ] Search works
- [ ] Profile shows stats
- [ ] No console errors

## Next Steps
- [ ] Add creature images
- [ ] Customize creature types
- [ ] Add more gyms
- [ ] Test on mobile
- [ ] Deploy to production
- [ ] Share with friends!

---

**Estimated Time**: 30-60 minutes for first-time setup

**Need Help?**: Check `DETAILED_SETUP_GUIDE.md` for in-depth explanations

