# WanderBeasts Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the database to be ready (usually 1-2 minutes)

2. **Run Database Migration**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Click "Run" to execute the migration
   - Verify that all tables were created successfully

3. **Enable PostGIS** (if not already enabled)
   - The migration should enable PostGIS automatically
   - If you get an error, go to Database > Extensions
   - Enable the `postgis` extension

4. **Get Your Supabase Credentials**
   - Go to Project Settings > API
   - Copy your Project URL and anon/public key

### 3. Get API Keys

#### Mapbox
1. Sign up at [mapbox.com](https://mapbox.com)
2. Go to Account > Access Tokens
3. Copy your default public token (or create a new one)
4. Make sure the token has these scopes:
   - `styles:read`
   - `fonts:read`
   - `datasets:read`

#### Google Gemini
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Important**: Never commit the `.env` file to git! It's already in `.gitignore`.

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 6. Test the Application

1. **Sign Up**: Create a new account with email/password
2. **Allow Location Access**: When prompted, allow location access
3. **See Creatures**: Creatures should spawn on the map near your location
4. **Catch Creatures**: Tap on creature markers to catch them
5. **View Collection**: Navigate to the Collection tab to see caught creatures

## Troubleshooting

### Location Not Working

- **Browser Permissions**: Make sure you've allowed location access in your browser
- **HTTPS Required**: Some browsers require HTTPS for geolocation (use `https://localhost:3000` or deploy)
- **Device GPS**: Make sure your device's GPS is enabled

### Map Not Loading

- **Mapbox Token**: Verify your Mapbox token is correct in `.env`
- **Token Permissions**: Make sure your Mapbox token has the correct scopes
- **Network**: Check your internet connection

### Creatures Not Spawning

- **Database**: Verify the migration ran successfully
- **PostGIS**: Make sure PostGIS extension is enabled
- **Location**: Make sure location tracking is working
- **Console**: Check browser console for errors

### Authentication Issues

- **Supabase URL/Key**: Verify your Supabase credentials are correct
- **Email Verification**: Check your email for verification link (if enabled)
- **Row Level Security**: Make sure RLS policies are enabled in Supabase

### AI Recommendations Not Working

- **Gemini API Key**: Verify your API key is correct
- **API Quota**: Check if you've exceeded the free tier limit
- **Network**: Make sure you can reach Google's API

## Production Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy!

3. **Update Supabase Settings**
   - Go to Authentication > URL Configuration
   - Add your Vercel URL to allowed redirect URLs

### Other Platforms

The app can be deployed to any static hosting service:
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

## Database Maintenance

### Cleanup Expired Spawns

Run this periodically (or set up a cron job):

```sql
SELECT cleanup_expired_spawns();
```

### Add More Creatures

```sql
INSERT INTO creature_types (name, rarity, type, base_spawn_rate, park_boost_multiplier, region_locked, allowed_countries)
VALUES ('Your Creature', 'rare', 'urban', 0.03, 2.0, false, NULL);
```

### Add Gyms

```sql
INSERT INTO gyms (name, description, location, booking_url)
VALUES (
  'Central Park Gym',
  'A special location in Central Park',
  ST_SetSRID(ST_MakePoint(-73.9654, 40.7829), 4326)::geography,
  'https://booking.com/...'
);
```

## Next Steps

- Customize creature types and spawn rates
- Add more gyms in your area
- Configure region locking for special creatures
- Customize the UI colors and styling
- Add more features (battles, trading, etc.)

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs for database errors
3. Verify all environment variables are set correctly
4. Make sure all API keys are valid and have proper permissions

For more help, open an issue on GitHub.

