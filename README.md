# WanderBeasts - Location-Based Creature Collecting Game

A Pokemon GO-style progressive web app where users catch travel-themed creatures in real-world locations.

## Features

- 🗺️ **Real-time GPS tracking** with Mapbox GL JS
- 🐾 **Creature spawning system** with rarity tiers
- 🌳 **Park detection** with boosted spawn rates
- 🎯 **Catch mechanics** with proximity validation
- 📦 **Collection storage** with stats tracking
- 🤖 **AI hunting recommendations** via Google Gemini
- 🏋️ **Gym RSVP system** with real-time updates
- 🔍 **Search functionality** for creatures and gyms
- 📱 **PWA support** for mobile installation

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Maps**: Mapbox GL JS
- **Backend**: Supabase (PostgreSQL + PostGIS)
- **AI**: Google Gemini API
- **Green Space Data**: OpenStreetMap Overpass API
- **Hosting**: Vercel (recommended)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Enable PostGIS extension in your Supabase project
4. Copy your Supabase URL and anon key

### 3. Get API Keys

1. **Mapbox**: Sign up at [mapbox.com](https://mapbox.com) and get your access token
2. **Google Gemini**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_GEMINI_API_KEY=your_gemini_key
```

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 6. Build for Production

```bash
npm run build
```

## Database Schema

The app uses PostgreSQL with PostGIS for geospatial queries:

- **profiles**: User profiles with stats
- **creature_types**: Creature metadata and rarity
- **spawns**: Active creature spawns (15min TTL)
- **catches**: User's caught creatures
- **gyms**: Special locations for RSVP
- **rsvps**: Gym RSVP system
- **ai_tips**: Cached AI recommendations

## Features in Detail

### Creature Spawning

- Grid-based spawning system (100m cells)
- Rarity-based spawn rates (common to legendary)
- Park boost multiplier (2-3x spawn rate)
- Region locking for special creatures
- 15-minute spawn expiration

### Catch Mechanics

- Proximity validation (50m range)
- Movement speed checks (anti-cheat)
- Server-side validation
- One-time catch per spawn
- Random CP level assignment (1-100)

### Park Detection

- OpenStreetMap integration
- Detects parks, nature reserves, and green spaces
- Cached queries for performance
- Boosts spawn rates in parks

### AI Recommendations

- Google Gemini integration
- Location-based hunting tips
- Context-aware suggestions
- 30-minute cache per location

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

The app can be deployed to any static hosting service that supports:
- Environment variables
- Single Page Applications (SPA)
- Service Workers (for PWA)

## Mobile Support

The app is optimized for mobile devices:
- Touch-friendly interface
- Responsive design
- PWA manifest for "Add to Home Screen"
- GPS location tracking
- Offline-capable (with service worker)

## Security

- Row Level Security (RLS) on all tables
- Server-side validation for catches
- Rate limiting on AI API calls
- Movement speed checks
- Proximity validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for your hackathon project!

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for hackathons and location-based gaming
