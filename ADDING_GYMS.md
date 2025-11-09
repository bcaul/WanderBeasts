# Adding Gyms to WanderBeasts

This guide explains how to add gyms to your WanderBeasts game.

## What are Gyms?

Gyms are special locations where epic and legendary creatures spawn. These creatures are **always visible** at the gym, but can only be **caught when 5 or more players are present** at the gym location.

## How to Add Gyms

### Step 1: Find Coordinates for Your Location

1. Go to [Google Maps](https://www.google.com/maps)
2. Navigate to the location where you want to add a gym
3. Right-click on the exact spot
4. Click on the coordinates that appear (they'll be in decimal format, e.g., `40.782865, -73.965355`)
5. Copy both the latitude and longitude

**Important:** Note the order - coordinates are usually displayed as `latitude, longitude`, but in the database we use `longitude, latitude` (X, Y order).

### Step 2: Add Gym to Database

You can add gyms using one of these methods:

#### Option A: Using SQL (Recommended)

1. Open your Supabase SQL editor
2. Run this SQL command, replacing the values:

```sql
INSERT INTO gyms (name, description, location, booking_url) VALUES
  (
    'Your Gym Name',
    'Description of your gym location',
    ST_SetSRID(ST_MakePoint(-73.965355, 40.782865), 4326), -- Replace with your longitude, latitude
    NULL -- Optional: Add a booking URL if applicable
  );
```

#### Option B: Using the Sample Gym Script

1. Open `supabase/migrations/012_add_sample_gyms.sql`
2. Edit the coordinates in the file to match your location
3. Run the migration in your Supabase SQL editor

### Step 3: Initialize Creatures at Your Gym

After adding a gym, run this SQL to spawn epic/legendary creatures:

```sql
SELECT initialize_gym_creatures();
```

This will create 2-3 epic/legendary creatures at each gym.

### Step 4: Verify Your Gym

1. Open your app and navigate to the location
2. You should see a purple gym marker (🏋️) on the map
3. Click on it to see the gym details
4. You should see epic/legendary creatures displayed at the gym

## Example Locations

Here are some example coordinates you can use:

### New York City
- Central Park: `ST_MakePoint(-73.965355, 40.782865)`
- Times Square: `ST_MakePoint(-73.985130, 40.758896)`

### San Francisco
- Golden Gate Park: `ST_MakePoint(-122.4833, 37.7694)`
- Fisherman's Wharf: `ST_MakePoint(-122.4094, 37.8080)`

### London
- Hyde Park: `ST_MakePoint(-0.1657, 51.5074)`
- Trafalgar Square: `ST_MakePoint(-0.1281, 51.5081)`

## How Gym Creatures Work

1. **Always Visible**: Epic/legendary creatures are always displayed at gyms
2. **Locked Until 5+ Players**: Creatures can only be caught when 5+ players are within 100m of the gym
3. **Player Tracking**: Players are automatically tracked when they're within 100m of a gym
4. **RSVP System**: Players can RSVP to gyms to coordinate meetups
5. **Real-time Updates**: Player counts update every 30 seconds

## Managing Gyms

### View All Gyms

```sql
SELECT id, name, description, location, created_at
FROM gyms;
```

### Delete a Gym

```sql
DELETE FROM gyms WHERE id = 'your-gym-id';
```

### Update Gym Location

```sql
UPDATE gyms
SET location = ST_SetSRID(ST_MakePoint(-73.965355, 40.782865), 4326)
WHERE id = 'your-gym-id';
```

## Troubleshooting

### Gym Not Appearing on Map

1. Check if the gym was created: `SELECT * FROM gyms;`
2. Verify coordinates are correct (longitude first, then latitude)
3. Make sure you're within 5km of the gym location
4. Refresh the page

### No Creatures at Gym

1. Run: `SELECT initialize_gym_creatures();`
2. Check if creatures exist: `SELECT * FROM spawns WHERE gym_id = 'your-gym-id';`
3. Make sure you have epic/legendary creatures in your `creature_types` table

### Creatures Not Catchable

1. Check player count: The gym needs 5+ players within 100m
2. Verify players are being tracked: `SELECT * FROM gym_player_locations WHERE gym_id = 'your-gym-id';`
3. Make sure players are actually at the gym location (within 100m)

## Notes

- Gyms should be placed in publicly accessible locations
- Consider placing gyms in parks, landmarks, or popular gathering spots
- The system automatically refreshes gym creatures every 5 minutes
- Creatures at gyms last 24 hours (longer than regular spawns)

