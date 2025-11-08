# Mapbox Style Configuration

## Custom Mapbox Style

The Mapbox style is configured in `src/components/Map.jsx` on line 58.

### Default Style
The default style is: `mapbox://styles/mapbox/dark-v11`

### Using Your Custom Mapbox Style

You can change the Mapbox style in two ways:

#### Option 1: Environment Variable (Recommended)
Add to your `.env` file:
```env
VITE_MAPBOX_STYLE=mapbox://styles/your-username/your-style-id
```

#### Option 2: Direct Code Change
Edit `src/components/Map.jsx` line 58:
```javascript
const mapboxStyle = 'mapbox://styles/your-username/your-style-id'
```

### Getting Your Mapbox Style URL

1. Go to [Mapbox Studio](https://studio.mapbox.com/)
2. Create or open your custom style
3. Click "Share" button
4. Copy the style URL (format: `mapbox://styles/your-username/your-style-id`)
5. Use it in your `.env` file or code

### Example Styles

- Dark theme: `mapbox://styles/mapbox/dark-v11`
- Light theme: `mapbox://styles/mapbox/light-v11`
- Satellite: `mapbox://styles/mapbox/satellite-v9`
- Streets: `mapbox://styles/mapbox/streets-v12`

### Code Location

The style configuration is in:
- File: `src/components/Map.jsx`
- Lines: 54-62

```javascript
// Mapbox style configuration
// You can change this to your custom Mapbox style URL:
// Example: 'mapbox://styles/your-username/your-style-id'
// Or use a standard Mapbox style: 'mapbox://styles/mapbox/dark-v11'
const mapboxStyle = import.meta.env.VITE_MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11'

map.current = new mapboxgl.Map({
  container: mapContainer.current,
  style: mapboxStyle,
  center: [0, 0],
  zoom: 15,
})
```

