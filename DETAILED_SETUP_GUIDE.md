# WanderBeasts - Extremely Detailed Setup Guide

This guide will walk you through every single step needed to get WanderBeasts running, with in-depth explanations of what's happening at each stage.

---

## Table of Contents

1. [Prerequisites and System Requirements](#1-prerequisites-and-system-requirements)
2. [Installing Node.js and npm](#2-installing-nodejs-and-npm)
3. [Installing Project Dependencies](#3-installing-project-dependencies)
4. [Setting Up Supabase (Complete Database Setup)](#4-setting-up-supabase-complete-database-setup)
5. [Getting Mapbox API Key](#5-getting-mapbox-api-key)
6. [Getting Google Gemini API Key](#6-getting-google-gemini-api-key)
7. [Configuring Environment Variables](#7-configuring-environment-variables)
8. [Understanding the Database Schema](#8-understanding-the-database-schema)
9. [Testing the Application Locally](#9-testing-the-application-locally)
10. [Deploying to Production (Vercel)](#10-deploying-to-production-vercel)
11. [Troubleshooting Common Issues](#11-troubleshooting-common-issues)

---

## 1. Prerequisites and System Requirements

### What You Need

Before starting, ensure you have:

1. **A Computer** (Windows, macOS, or Linux)
   - At least 4GB RAM (8GB recommended)
   - Stable internet connection
   - A modern web browser (Chrome, Firefox, Safari, or Edge)

2. **A Code Editor** (Optional but Recommended)
   - Visual Studio Code (free) - Recommended
   - Or any text editor you're comfortable with

3. **Accounts for Free Services**
   - GitHub account (for code hosting) - free
   - Supabase account (for database) - free tier available
   - Mapbox account (for maps) - free tier available
   - Google account (for Gemini AI) - free tier available

4. **Basic Command Line Knowledge**
   - You should know how to open a terminal/command prompt
   - Basic commands: `cd`, `ls`/`dir`, `mkdir`

### Why Each Component is Needed

- **Node.js**: Runs JavaScript on your computer (required for development)
- **Supabase**: Provides the database and authentication (free PostgreSQL database)
- **Mapbox**: Provides map tiles and geocoding (free map service)
- **Google Gemini**: Provides AI recommendations (free AI API)

---

## 2. Installing Node.js and npm

### Step 2.1: Check if Node.js is Already Installed

Open your terminal/command prompt and type:

```bash
node --version
npm --version
```

**What this does**: Checks if Node.js and npm are installed.

**Expected output**: Version numbers like `v20.10.0` and `10.2.3`

**If you see version numbers**: Skip to step 2.3.

**If you see an error**: Continue to step 2.2.

### Step 2.2: Download and Install Node.js

1. **Go to the Node.js website**
   - Visit: https://nodejs.org/
   - You'll see two versions: LTS (Long Term Support) and Current
   - **Choose LTS** (recommended for stability)

2. **Download the Installer**
   - Click the LTS button
   - The website will detect your operating system
   - Download the installer (`.msi` for Windows, `.pkg` for macOS, or `.tar.xz` for Linux)

3. **Run the Installer**
   - **Windows**: Double-click the `.msi` file
     - Click "Next" through the installation wizard
     - **Important**: Make sure "Add to PATH" is checked
     - Click "Install" (you may need administrator privileges)
   - **macOS**: Double-click the `.pkg` file
     - Follow the installation wizard
     - You may need to enter your password
   - **Linux**: Extract the archive and follow installation instructions
     ```bash
     # Example for Ubuntu/Debian
     sudo apt update
     sudo apt install nodejs npm
     ```

4. **Verify Installation**
   - Close and reopen your terminal/command prompt
   - Run: `node --version` and `npm --version`
   - You should see version numbers

**What happens during installation**: 
- Node.js runtime is installed (allows JavaScript to run outside browsers)
- npm (Node Package Manager) is installed (allows you to install JavaScript libraries)
- Both are added to your system PATH (allows you to run them from anywhere)

**Common Issues**:
- **"node is not recognized"**: Node.js wasn't added to PATH. Reinstall and check "Add to PATH"
- **Permission errors (Linux/Mac)**: Use `sudo` or install via a version manager like `nvm`

---

## 3. Installing Project Dependencies

### Step 3.1: Navigate to Project Directory

Open your terminal/command prompt and navigate to the project folder:

```bash
# Windows
cd C:\Users\bcaul\Pokemon_Gone

# macOS/Linux
cd ~/Pokemon_Gone
# or wherever you saved the project
```

**What this does**: Changes your current directory to the project folder.

**Verify you're in the right place**: 
- You should see `package.json` file
- Run: `dir` (Windows) or `ls` (macOS/Linux) to list files
- You should see: `package.json`, `src/`, `supabase/`, etc.

### Step 3.2: Install Dependencies

Run this command:

```bash
npm install
```

**What this command does**:
1. Reads `package.json` file
2. Downloads all dependencies listed in `dependencies` and `devDependencies`
3. Creates a `node_modules/` folder with all libraries
4. Creates a `package-lock.json` file (locks dependency versions)

**Expected output**: You'll see a lot of text scrolling by, like:
```
npm WARN deprecated...
added 543 packages in 2m
```

**How long it takes**: Usually 1-5 minutes depending on your internet speed.

**What's being installed**:
- **react** & **react-dom**: The React library for building UI
- **react-router-dom**: For navigation between pages
- **@supabase/supabase-js**: Client library for Supabase
- **mapbox-gl**: Mapbox GL JS for maps
- **@google/generative-ai**: Google Gemini AI client
- **lucide-react**: Icon library
- **tailwindcss**: CSS framework for styling
- **vite**: Build tool and development server
- And many more...

**Common Issues**:

1. **"npm is not recognized"**
   - Node.js/npm not installed or not in PATH
   - Reinstall Node.js and ensure "Add to PATH" is checked

2. **Permission errors (EACCES)**
   - **Windows**: Run terminal as Administrator
   - **macOS/Linux**: Don't use `sudo` with npm install (creates permission issues)
     - Fix ownership: `sudo chown -R $(whoami) ~/.npm`
     - Or use a Node version manager like `nvm`

3. **Network errors (ETIMEDOUT)**
   - Check your internet connection
   - Try again (npm sometimes has temporary issues)
   - If using a corporate network, you may need to configure a proxy

4. **"Module not found" errors after installation**
   - Delete `node_modules/` folder and `package-lock.json`
   - Run `npm install` again

### Step 3.3: Verify Installation

Check that everything installed correctly:

```bash
# Check if node_modules exists
dir node_modules
# or
ls node_modules

# Try running the dev server (it will fail without API keys, but that's OK)
npm run dev
```

**Expected behavior**: 
- You should see `node_modules/` folder (very large, ~100MB+)
- Running `npm run dev` should start the dev server (even if it shows errors about missing API keys)

**Press Ctrl+C to stop the dev server** after verifying it starts.

---

## 4. Setting Up Supabase (Complete Database Setup)

Supabase is a free PostgreSQL database with built-in authentication. This is where all your app data will be stored.

### Step 4.1: Create a Supabase Account

1. **Go to Supabase**
   - Visit: https://supabase.com
   - Click "Start your project" or "Sign up"

2. **Sign Up**
   - You can sign up with GitHub (easiest) or email
   - If using email: Enter your email, verify it, create a password
   - If using GitHub: Authorize Supabase to access your GitHub account

3. **Complete Onboarding**
   - You may be asked about your use case
   - Select "Building a new project" or similar
   - This is just for their analytics

### Step 4.2: Create a New Project

1. **Click "New Project"**
   - You'll see a dashboard with your projects (empty if first time)

2. **Fill in Project Details**
   - **Name**: `wanderbeasts` (or any name you like)
   - **Database Password**: Create a strong password
     - **Important**: Save this password! You'll need it if you want to connect directly to the database
     - Minimum 12 characters, mix of letters, numbers, symbols
   - **Region**: Choose the region closest to you
     - This affects latency (how fast database queries are)
     - US regions: `us-east-1`, `us-west-1`
     - EU regions: `eu-west-1`, `eu-central-1`
     - Asia: `ap-southeast-1`
   - **Pricing Plan**: Select "Free" (free tier is generous)

3. **Click "Create new project"**
   - **Wait 1-2 minutes**: Supabase is setting up your database
   - You'll see a progress indicator
   - Don't close the tab during setup

**What's happening**: 
- Supabase is creating a PostgreSQL database instance
- Setting up authentication system
- Creating API endpoints
- Allocating storage and compute resources

### Step 4.3: Get Your Supabase Credentials

Once your project is ready:

1. **Go to Project Settings**
   - Click the gear icon (⚙️) in the left sidebar
   - Or click "Project Settings" at the bottom of the sidebar

2. **Navigate to API**
   - In the settings menu, click "API"
   - You'll see several important pieces of information

3. **Copy Your Credentials**
   - **Project URL**: Looks like `https://xxxxxxxxxxxxx.supabase.co`
     - Click the copy button next to it
     - Save this somewhere safe (you'll need it soon)
   - **anon public key**: A long string starting with `eyJ...`
     - This is your public API key (safe to use in frontend code)
     - Click the copy button
     - Save this as well
   - **service_role key**: (Don't copy this yet, only needed for admin operations)

**Why you need these**:
- **Project URL**: Where your app connects to Supabase
- **anon key**: Authenticates requests from your app (publicly visible but safe)

**Security Note**: The `anon` key is designed to be public (used in frontend code). Row Level Security (RLS) policies protect your data, not the key itself.

### Step 4.4: Enable PostGIS Extension

PostGIS adds geospatial capabilities to PostgreSQL (needed for location-based queries).

1. **Go to Database**
   - Click "Database" in the left sidebar
   - Or go to: Project Settings → Database

2. **Navigate to Extensions**
   - Click "Extensions" in the database menu
   - You'll see a list of available extensions

3. **Enable PostGIS**
   - Find "postgis" in the list
   - Click the toggle to enable it
   - Wait a few seconds for it to enable

**What PostGIS does**: 
- Allows you to store geographic coordinates (latitude/longitude)
- Provides functions like `ST_DWithin` (find points within distance)
- Enables spatial indexing for fast location queries

**If PostGIS is not in the list**: 
- Your Supabase project might be on an older version
- Contact Supabase support or use a different region

### Step 4.5: Run the Database Migration

This creates all the tables, indexes, and functions your app needs.

1. **Go to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - This is where you run SQL commands

2. **Create a New Query**
   - Click "New query" button
   - A blank editor will appear

3. **Open the Migration File**
   - On your computer, open: `supabase/migrations/001_initial_schema.sql`
   - **Select all** the contents (Ctrl+A / Cmd+A)
   - **Copy** it (Ctrl+C / Cmd+C)

4. **Paste into SQL Editor**
   - Click in the SQL Editor
   - **Paste** the migration (Ctrl+V / Cmd+V)
   - You should see a long SQL script

5. **Review the Migration** (Optional but Recommended)
   - Scroll through to understand what it does:
     - Creates `profiles` table (user profiles)
     - Creates `creature_types` table (creature definitions)
     - Creates `spawns` table (active creature spawns)
     - Creates `catches` table (user's caught creatures)
     - Creates `gyms` table (special locations)
     - Creates `rsvps` table (gym RSVPs)
     - Creates `ai_tips` table (cached AI recommendations)
     - Creates indexes for performance
     - Creates functions (RPC endpoints)
     - Sets up Row Level Security policies
     - Seeds initial creature types

6. **Run the Migration**
   - Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for it to complete (usually 5-10 seconds)

7. **Verify Success**
   - You should see "Success. No rows returned" or similar
   - Check the bottom panel for any errors
   - **If you see errors**: Scroll down for troubleshooting

**What the migration does in detail**:

1. **Enables PostGIS**: `CREATE EXTENSION IF NOT EXISTS postgis;`
   - Adds geospatial functions to PostgreSQL

2. **Creates Tables**:
   - `profiles`: Stores user information (username, stats)
   - `creature_types`: Defines creature types (name, rarity, spawn rates)
   - `spawns`: Active creature spawns with locations (expires after 15 min)
   - `catches`: Records of caught creatures
   - `gyms`: Special locations for RSVPs
   - `rsvps`: User RSVPs for gyms
   - `ai_tips`: Cached AI recommendations

3. **Creates Indexes**:
   - Spatial indexes on location columns (GIST indexes)
   - Indexes on foreign keys and commonly queried columns
   - These make queries much faster

4. **Creates Functions**:
   - `get_nearby_spawns()`: Finds spawns within a radius (uses PostGIS)
   - `increment_catches()`: Updates user stats when catching
   - `handle_new_user()`: Auto-creates profile on signup
   - `cleanup_expired_spawns()`: Removes old spawns

5. **Sets up Security**:
   - Row Level Security (RLS) policies
   - Users can only see their own catches
   - Spawns are public (anyone can see them)
   - Gyms are public

6. **Seeds Data**:
   - Inserts 5 initial creature types:
     - Beach Buddy (common, water)
     - Mountain Mite (uncommon, rock)
     - City Slicker (common, urban)
     - Forest Friend (uncommon, nature)
     - Landmark Legend (legendary, landmark, region-locked)

### Step 4.6: Verify Tables Were Created

1. **Go to Table Editor**
   - Click "Table Editor" in the left sidebar
   - You should see all your tables listed:
     - `profiles`
     - `creature_types`
     - `spawns`
     - `catches`
     - `gyms`
     - `rsvps`
     - `ai_tips`

2. **Check creature_types Table**
   - Click on `creature_types`
   - You should see 5 rows (the seeded creatures)
   - If empty, the seed didn't run (check migration output for errors)

3. **Check Table Structure** (Optional)
   - Click on a table
   - Click "Structure" tab
   - Verify columns match what's expected

**Common Migration Errors**:

1. **"permission denied for extension postgis"**
   - PostGIS extension not enabled
   - Go back to step 4.4 and enable it

2. **"relation already exists"**
   - Tables already exist (maybe you ran migration twice)
   - This is OK, the migration uses `IF NOT EXISTS`
   - You can ignore these warnings

3. **"function already exists"**
   - Functions already exist
   - This is OK, you can ignore

4. **Syntax errors**
   - Check that you copied the entire migration file
   - Make sure there are no extra characters
   - Try running it again

### Step 4.7: Test Database Connection (Optional)

You can verify everything works by running a test query:

1. **Go back to SQL Editor**
2. **Run this query**:
   ```sql
   SELECT * FROM creature_types;
   ```
3. **Expected result**: You should see 5 rows with creature data

---

## 5. Getting Mapbox API Key

Mapbox provides the maps and geocoding services.

### Step 5.1: Create a Mapbox Account

1. **Go to Mapbox**
   - Visit: https://mapbox.com
   - Click "Sign up" (top right)

2. **Sign Up**
   - You can sign up with GitHub, Google, or email
   - Choose the easiest option for you
   - Fill in your details

3. **Verify Email** (if using email)
   - Check your email
   - Click the verification link

### Step 5.2: Create an Access Token

1. **Go to Account Page**
   - After signing up, you'll be taken to your account
   - Or click your profile picture → "Account"

2. **Navigate to Access Tokens**
   - Click "Access tokens" in the account menu
   - Or go directly to: https://account.mapbox.com/access-tokens/

3. **Find Your Default Public Token**
   - You'll see a token called "Default public token"
   - It starts with `pk.` (public key)
   - **Copy this token** (click the copy button)

**Alternative: Create a New Token**

1. **Click "Create a token"**
2. **Name it**: `wanderbeasts` (or any name)
3. **Set Scopes**: 
   - `styles:read` (required for maps)
   - `fonts:read` (required for map fonts)
   - `datasets:read` (optional, for custom data)
4. **Set URL restrictions** (optional but recommended for production):
   - Add your domain (e.g., `https://yourdomain.com`)
   - For development, you can leave it blank
5. **Click "Create token"**
6. **Copy the token**

**Token Types**:
- **Public token** (`pk.`): Used in frontend code (safe to expose)
- **Secret token** (`sk.`): Used in backend (never expose)

**Free Tier Limits**:
- 50,000 map loads per month (free)
- 100,000 geocoding requests per month (free)
- More than enough for development and small production apps

### Step 5.3: Test Your Token (Optional)

You can test if your token works:

1. **Visit this URL** (replace `YOUR_TOKEN` with your token):
   ```
   https://api.mapbox.com/styles/v1/mapbox/streets-v11?access_token=YOUR_TOKEN
   ```
2. **Expected result**: You should see JSON data (not an error)

---

## 6. Getting Google Gemini API Key

Google Gemini provides AI-powered hunting recommendations.

### Step 6.1: Go to Google AI Studio

1. **Visit Google AI Studio**
   - Go to: https://makersuite.google.com/app/apikey
   - Or search "Google AI Studio" in Google

2. **Sign In**
   - Sign in with your Google account
   - If you don't have one, create a free Google account

### Step 6.2: Create an API Key

1. **Click "Create API Key"**
   - You'll see a button or link to create an API key
   - You may be asked to select a Google Cloud project
   - If you don't have one, create a new project (it's free)

2. **Create/Select Project**
   - If creating new: Name it `wanderbeasts` (or any name)
   - Click "Create"

3. **Copy Your API Key**
   - A dialog will appear with your API key
   - It looks like: `AIzaSy...` (long string)
   - **Copy this immediately** (you won't see it again)
   - Save it somewhere safe

**Important**: 
- The API key is shown only once
- If you lose it, you'll need to create a new one
- Store it securely (but it's OK to use in frontend for this project)

### Step 6.3: Understand API Limits

**Free Tier**:
- 1,500 requests per day (free)
- 15 requests per minute (rate limit)
- More than enough for development

**What counts as a request**:
- Each AI recommendation call = 1 request
- Requests are cached for 30 minutes (reduces API calls)

### Step 6.4: Enable API (If Needed)

If you get errors about API not enabled:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Enable Gemini API**
   - Go to "APIs & Services" → "Library"
   - Search for "Generative Language API"
   - Click "Enable"

**Note**: For most users, the API is enabled automatically when you create the key.

---

## 7. Configuring Environment Variables

Environment variables store sensitive configuration (API keys, URLs) separately from your code.

### Step 7.1: Create .env File

1. **Navigate to Project Root**
   - Make sure you're in the project folder: `C:\Users\bcaul\Pokemon_Gone`

2. **Create .env File**
   - **Windows**:
     - Open Notepad
     - Save as: `.env` (with the dot at the beginning)
     - Make sure "Save as type" is "All Files" (not .txt)
   - **macOS/Linux**:
     ```bash
     touch .env
     ```

3. **Verify File Created**
   - You should see `.env` in your project folder
   - It might be hidden (files starting with `.` are often hidden)
   - **Windows**: In File Explorer, enable "Show hidden files"
   - **macOS/Linux**: Use `ls -la` to see hidden files

### Step 7.2: Add Environment Variables

Open `.env` file in a text editor and add:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_MAPBOX_TOKEN=pk.your-mapbox-token-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

**Replace the placeholders**:

1. **VITE_SUPABASE_URL**:
   - Get from: Supabase → Project Settings → API → Project URL
   - Example: `https://abcdefghijklmnop.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**:
   - Get from: Supabase → Project Settings → API → anon public key
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **VITE_MAPBOX_TOKEN**:
   - Get from: Mapbox → Account → Access Tokens
   - Example: `pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImN...`

4. **VITE_GEMINI_API_KEY**:
   - Get from: Google AI Studio → API Keys
   - Example: `AIzaSyAbcdefghijklmnopqrstuvwxyz1234567`

**Important Notes**:
- **No spaces** around the `=` sign
- **No quotes** around the values (unless the value itself contains spaces)
- **One variable per line**
- **Don't commit this file to git** (it's already in `.gitignore`)

### Step 7.3: Verify .env File

Your `.env` file should look like this (with your actual values):

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNrbXAxYXp1djAwMXYycW82bGZ2bXo2dW8ifQ.abcdefghijklmnopqrstuvwxyz
VITE_GEMINI_API_KEY=AIzaSyAbcdefghijklmnopqrstuvwxyz1234567
```

### Step 7.4: Understand VITE_ Prefix

**Why `VITE_` prefix?**
- Vite (the build tool) only exposes environment variables that start with `VITE_`
- This prevents accidentally exposing sensitive backend variables
- Variables without `VITE_` won't be accessible in your React code

**How to Use in Code**:
```javascript
// In your React components
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
```

### Step 7.5: Restart Development Server

**Important**: After creating/updating `.env` file:
1. **Stop the dev server** (if running): Press `Ctrl+C`
2. **Start it again**: `npm run dev`
3. Environment variables are loaded when the server starts

---

## 8. Understanding the Database Schema

This section explains what each table does and how data flows through the app.

### 8.1: Profiles Table

**Purpose**: Stores user account information and statistics.

**Columns**:
- `id` (UUID): Links to `auth.users` (Supabase Auth)
- `username` (TEXT): User's display name
- `created_at` (TIMESTAMP): When account was created
- `total_catches` (INT): Total number of creatures caught
- `unique_catches` (INT): Number of unique species caught

**How it's used**:
- Created automatically when user signs up (trigger)
- Updated when user catches creatures (function)
- Displayed in Profile page

**Example Row**:
```
id: 123e4567-e89b-12d3-a456-426614174000
username: "TrainerAsh"
created_at: 2024-01-15 10:30:00
total_catches: 42
unique_catches: 5
```

### 8.2: Creature Types Table

**Purpose**: Defines the different types of creatures that can spawn.

**Columns**:
- `id` (SERIAL): Unique ID
- `name` (TEXT): Creature name (e.g., "Beach Buddy")
- `rarity` (TEXT): common, uncommon, rare, epic, legendary
- `type` (TEXT): water, rock, urban, nature, landmark
- `image_url` (TEXT): URL to creature image (optional)
- `region_locked` (BOOLEAN): Whether creature is region-specific
- `allowed_countries` (TEXT[]): Array of country codes (e.g., ['US', 'CA'])
- `base_spawn_rate` (FLOAT): Base chance of spawning (0.0 to 1.0)
- `park_boost_multiplier` (FLOAT): Spawn rate multiplier in parks

**How it's used**:
- Queried when generating spawns
- Filtered by region for region-locked creatures
- Displayed in Collection and Catch Modal

**Example Row**:
```
id: 1
name: "Beach Buddy"
rarity: "common"
type: "water"
region_locked: false
allowed_countries: null
base_spawn_rate: 0.08
park_boost_multiplier: 2.0
```

### 8.3: Spawns Table

**Purpose**: Stores active creature spawns (temporary, expire after 15 minutes).

**Columns**:
- `id` (UUID): Unique spawn ID
- `creature_type_id` (INT): References `creature_types.id`
- `location` (GEOGRAPHY): PostGIS point (latitude/longitude)
- `spawned_at` (TIMESTAMP): When spawn was created
- `expires_at` (TIMESTAMP): When spawn expires (15 min after spawn)
- `in_park` (BOOLEAN): Whether spawn is in a park

**How it's used**:
- Queried to find nearby spawns (PostGIS `ST_DWithin`)
- Displayed as markers on map
- Deleted after catch or expiration
- Cleaned up periodically

**Example Row**:
```
id: 789e4567-e89b-12d3-a456-426614174999
creature_type_id: 1
location: POINT(-73.9857 40.7580)  -- Central Park, NYC
spawned_at: 2024-01-15 10:30:00
expires_at: 2024-01-15 10:45:00
in_park: true
```

### 8.4: Catches Table

**Purpose**: Records of creatures caught by users.

**Columns**:
- `id` (UUID): Unique catch ID
- `user_id` (UUID): References `profiles.id`
- `creature_type_id` (INT): References `creature_types.id`
- `caught_at` (TIMESTAMP): When creature was caught
- `catch_location` (GEOGRAPHY): Where creature was caught
- `cp_level` (INT): Combat Power (1-100, random)

**How it's used**:
- Created when user catches a creature
- Queried to show user's collection
- Used to calculate stats (total catches, unique species)
- Protected by RLS (users can only see their own catches)

**Example Row**:
```
id: 456e7890-e89b-12d3-a456-426614175000
user_id: 123e4567-e89b-12d3-a456-426614174000
creature_type_id: 1
caught_at: 2024-01-15 10:35:00
catch_location: POINT(-73.9857 40.7580)
cp_level: 67
```

### 8.5: Gyms Table

**Purpose**: Special locations where users can RSVP.

**Columns**:
- `id` (UUID): Unique gym ID
- `name` (TEXT): Gym name
- `description` (TEXT): Gym description (optional)
- `location` (GEOGRAPHY): Gym location
- `created_at` (TIMESTAMP): When gym was created
- `booking_url` (TEXT): Optional Booking.com link

**How it's used**:
- Displayed on map and in search
- Users can RSVP to gyms
- Could trigger special events (rare spawns)

**Example Row**:
```
id: 321e6543-e89b-12d3-a456-426614175111
name: "Central Park Gym"
description: "A special location in Central Park"
location: POINT(-73.9654 40.7829)
booking_url: "https://booking.com/..."
```

### 8.6: RSVPs Table

**Purpose**: Tracks which users RSVPed to which gyms.

**Columns**:
- `id` (UUID): Unique RSVP ID
- `gym_id` (UUID): References `gyms.id`
- `user_id` (UUID): References `profiles.id`
- `created_at` (TIMESTAMP): When RSVP was created

**Constraints**:
- Unique constraint on (`gym_id`, `user_id`) - user can only RSVP once per gym

**How it's used**:
- Counted to show RSVP count on gyms
- Real-time updates via Supabase Realtime
- Displayed in gym cards

### 8.7: AI Tips Table

**Purpose**: Caches AI-generated hunting recommendations.

**Columns**:
- `id` (UUID): Unique tip ID
- `location_type` (TEXT): Location category (e.g., "beach", "mountain")
- `tip` (TEXT): The AI-generated tip
- `created_at` (TIMESTAMP): When tip was created

**How it's used**:
- Caches recommendations to reduce API calls
- Queried before calling Gemini API
- Expires after 30 minutes (handled in code, not database)

### 8.8: Database Functions

**get_nearby_spawns(user_lat, user_lon, radius_meters)**:
- Finds all spawns within a radius of user location
- Uses PostGIS `ST_DWithin` for efficient spatial query
- Returns spawns with distance calculated
- Used by `useCreatures` hook

**increment_catches(user_id)**:
- Increments `total_catches` in profiles
- Recalculates `unique_catches`
- Called after successful catch

**handle_new_user()**:
- Trigger function
- Automatically creates profile when user signs up
- Sets default username

**cleanup_expired_spawns()**:
- Deletes spawns where `expires_at < NOW()`
- Should be run periodically (cron job or scheduled function)

### 8.9: Row Level Security (RLS)

RLS ensures users can only access data they're allowed to see.

**Policies**:
- **Profiles**: Users can only see/update their own profile
- **Catches**: Users can only see their own catches (can insert their own)
- **Spawns**: Public (anyone can see active spawns)
- **Creature Types**: Public (anyone can see creature definitions)
- **Gyms**: Public (anyone can see gyms)
- **RSVPs**: Public read (anyone can see RSVPs), users can only create/delete their own

**Why RLS is Important**:
- Even if someone gets your API key, they can't access other users' data
- Security is enforced at the database level
- No need to check permissions in application code

---

## 9. Testing the Application Locally

Now that everything is set up, let's test the app!

### Step 9.1: Start the Development Server

1. **Open Terminal**
   - Navigate to project folder: `cd C:\Users\bcaul\Pokemon_Gone`

2. **Start Dev Server**
   ```bash
   npm run dev
   ```

3. **Expected Output**:
   ```
   VITE v6.4.1  ready in 500 ms

   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ➜  press h + enter to show help
   ```

4. **Open in Browser**
   - Open your browser
   - Go to: `http://localhost:5173`
   - You should see the app!

**What's happening**:
- Vite is starting a development server
- It's compiling your React code
- It's serving the app on port 5173
- It watches for file changes (hot reload)

**If you see errors**:
- Check that `.env` file exists and has correct values
- Check browser console for errors
- See Troubleshooting section

### Step 9.2: Test Authentication

1. **You should see the Auth page**
   - Sign up form should be visible

2. **Create an Account**
   - Enter an email (use a real email for testing)
   - Enter a password (minimum 6 characters)
   - Enter a username
   - Click "Create Account"

3. **Check Your Email** (if email verification is enabled)
   - Supabase may send a verification email
   - Click the verification link

4. **Sign In**
   - Enter your email and password
   - Click "Sign In"
   - You should be redirected to the Map page

**What's happening**:
- Supabase Auth is handling authentication
- User is created in `auth.users` table
- Profile is auto-created in `profiles` table (trigger)
- Session is stored in browser (localStorage)

**Common Issues**:
- **"Invalid login credentials"**: Wrong email/password
- **"Email not confirmed"**: Check your email for verification link
- **"User already registered"**: Account already exists, try signing in

### Step 9.3: Test Location Tracking

1. **Allow Location Access**
   - Browser will ask for location permission
   - Click "Allow" or "Allow location access"
   - **Important**: Location is required for the app to work

2. **Verify Location on Map**
   - Map should center on your location
   - You should see a blue dot (your location)
   - Map should be zoomed in (zoom level 16)

**What's happening**:
- Browser Geolocation API is getting your GPS coordinates
- Coordinates are sent to Mapbox to center the map
- Location is updated every 10 seconds

**Common Issues**:
- **"Location access denied"**: 
  - Go to browser settings
  - Allow location access for localhost
  - Refresh the page
- **"Location unavailable"**: 
  - Make sure GPS is enabled on your device
  - Try a different browser
  - For testing: Use browser dev tools to mock location
- **Map not loading**: 
  - Check Mapbox token in `.env`
  - Check browser console for errors
  - Make sure you have internet connection

**Testing on Mobile**:
- The app works on mobile browsers
- You'll need to access it via your computer's IP address
- Or use a service like ngrok to expose localhost
- Or deploy to Vercel (easier for mobile testing)

### Step 9.4: Test Creature Spawning

1. **Wait for Spawns** (may take a few seconds)
   - Creatures should appear on the map as colored markers
   - Different colors for different rarities:
     - Blue (common)
     - Yellow (uncommon)
     - Purple (rare)
     - Red (epic)
     - Gold (legendary)

2. **Verify Spawns in Database** (Optional)
   - Go to Supabase → Table Editor → `spawns`
   - You should see spawns near your location
   - Check that `expires_at` is 15 minutes in the future

**What's happening**:
- `generateSpawns()` function is called every 5 minutes
- It creates a grid of potential spawn points
- Each point has a chance to spawn a creature
- Spawns are inserted into database with PostGIS locations
- Map queries nearby spawns and displays them

**Common Issues**:
- **No spawns appearing**: 
  - Check browser console for errors
  - Check Supabase logs for database errors
  - Verify PostGIS is enabled
  - Wait a few minutes (spawns generate every 5 min)
- **Spawns in wrong location**: 
  - Check that location tracking is working
  - Verify coordinates are correct

### Step 9.5: Test Catching Creatures

1. **Click on a Creature Marker**
   - Click on any creature marker on the map
   - A modal should appear showing creature details

2. **Catch the Creature**
   - Make sure you're within 50 meters of the spawn
   - Click "Catch!" button
   - You should see a celebration animation
   - Modal should close automatically

3. **Verify in Collection**
   - Navigate to "Collection" tab (bottom navigation)
   - You should see your caught creature
   - Check stats (total catches should increase)

**What's happening**:
- User clicks marker → `CatchModal` opens
- User clicks "Catch!" → `handleCatch()` is called
- Server validates: spawn exists, not expired, user within range
- Creature is added to `catches` table
- Spawn is deleted (one-time catch)
- User stats are updated
- Collection is refreshed

**Common Issues**:
- **"You are too far away"**: 
  - Move closer to the spawn marker
  - Wait for location to update
- **"Creature has expired"**: 
  - Spawn expired (15 min TTL)
  - Wait for new spawns
- **"Already caught"**: 
  - Someone else caught it (spawns are one-time)
  - Wait for new spawns

### Step 9.6: Test Collection

1. **Navigate to Collection Tab**
   - Click "Collection" in bottom navigation
   - You should see your caught creatures

2. **Test Filtering**
   - Click rarity filters (common, uncommon, etc.)
   - Creatures should filter by rarity

3. **Test Sorting**
   - Change sort dropdown (date, CP, name)
   - Creatures should reorder

4. **Check Stats**
   - Verify total catches count
   - Verify unique species count
   - Verify highest CP

**What's happening**:
- `Collection` component queries `catches` table
- Groups catches by creature type
- Calculates stats (count, highest CP)
- Displays in grid layout

### Step 9.7: Test Search

1. **Navigate to Search Tab**
   - Click "Search" in bottom navigation

2. **Search for Creatures**
   - Type a creature name (e.g., "Beach")
   - Results should appear
   - Click on a result to navigate

3. **Search for Gyms**
   - Type a gym name
   - Results should appear

**What's happening**:
- Search queries `creature_types` and `gyms` tables
- Filters by name/description (case-insensitive)
- Displays results with details

### Step 9.8: Test AI Recommendations

1. **Look for AI Assistant**
   - On the Map page, you should see an "AI Hunting Tips" panel
   - It's in the bottom-right corner

2. **Expand Panel**
   - Click the expand button (chevron)
   - You should see AI-generated tips

3. **Verify Tips are Relevant**
   - Tips should mention your location
   - Tips should mention nearby parks (if any)
   - Tips should mention available creatures

**What's happening**:
- `AIAssistant` component calls Gemini API
- Sends user context (location, parks, creatures)
- Receives AI-generated tips
- Caches tips for 30 minutes
- Displays tips in panel

**Common Issues**:
- **No tips appearing**: 
  - Check Gemini API key in `.env`
  - Check browser console for errors
  - Verify API quota not exceeded
  - Check network connection

### Step 9.9: Test Profile

1. **Navigate to Profile Tab**
   - Click "Profile" in bottom navigation

2. **Verify Stats**
   - Check total catches
   - Check unique species
   - Check highest CP
   - Check average CP

3. **Check Rarity Breakdown**
   - Verify rarity counts are correct
   - Check progress bar

4. **Test Logout**
   - Click "Logout" button
   - You should be redirected to Auth page

**What's happening**:
- `Profile` component queries user's catches
- Calculates statistics
- Displays in cards and charts
- Logout clears session

### Step 9.10: Test on Mobile Device

1. **Find Your Computer's IP Address**
   - **Windows**: Open Command Prompt, run `ipconfig`, find "IPv4 Address"
   - **macOS/Linux**: Open Terminal, run `ifconfig`, find "inet" address
   - Example: `192.168.1.100`

2. **Start Dev Server with Host Flag**
   - Stop current server (Ctrl+C)
   - Run: `npm run dev -- --host`
   - Note the network URL (e.g., `http://192.168.1.100:5173`)

3. **Access from Mobile**
   - Make sure phone is on same WiFi network
   - Open mobile browser
   - Go to: `http://192.168.1.100:5173`
   - Allow location access
   - Test the app!

**Alternative: Use ngrok** (Easier)
1. **Install ngrok**: https://ngrok.com/download
2. **Start dev server**: `npm run dev`
3. **Expose with ngrok**: `ngrok http 5173`
4. **Use ngrok URL** on mobile (e.g., `https://abc123.ngrok.io`)

**What to Test on Mobile**:
- Location tracking
- Map interaction (pinch to zoom, drag)
- Catching creatures
- Navigation between tabs
- Touch interactions

---

## 10. Deploying to Production (Vercel)

Vercel is the easiest way to deploy your app. It's free and takes about 5 minutes.

### Step 10.1: Prepare Your Code

1. **Commit to Git** (If not already)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub**
   - Create a new repository on GitHub
   - Push your code:
     ```bash
     git remote add origin https://github.com/yourusername/wanderbeasts.git
     git push -u origin main
     ```

**Important**: Make sure `.env` is in `.gitignore` (it should be already).

### Step 10.2: Deploy to Vercel

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Sign up with GitHub (easiest)

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select the `wanderbeasts` repository

3. **Configure Project**
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add each variable:
     - `VITE_SUPABASE_URL`: Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
     - `VITE_MAPBOX_TOKEN`: Your Mapbox token
     - `VITE_GEMINI_API_KEY`: Your Gemini API key
   - Click "Add" for each

5. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes for build to complete
   - You'll get a URL like: `https://wanderbeasts.vercel.app`

### Step 10.3: Update Supabase Settings

1. **Go to Supabase Dashboard**
   - Project Settings → Authentication → URL Configuration

2. **Add Vercel URL**
   - Under "Redirect URLs", add: `https://your-app.vercel.app`
   - Under "Site URL", set: `https://your-app.vercel.app`
   - Click "Save"

### Step 10.4: Test Production App

1. **Visit Your Vercel URL**
   - Open: `https://your-app.vercel.app`
   - Test all features:
     - Sign up / Sign in
     - Location tracking
     - Catching creatures
     - Collection
     - Search
     - Profile

2. **Test on Mobile**
   - Open URL on mobile device
   - Allow location access
   - Test the app!

**What's happening**:
- Vercel builds your app (runs `npm run build`)
- Creates optimized production bundle
- Serves it from CDN (fast worldwide)
- Provides HTTPS (required for geolocation)
- Auto-deploys on git push (if enabled)

---

## 11. Troubleshooting Common Issues

### Issue: "Cannot find module" errors

**Symptoms**: 
- Error: `Cannot find module 'react'` or similar
- App won't start

**Solution**:
1. Delete `node_modules/` folder
2. Delete `package-lock.json`
3. Run `npm install` again
4. Try `npm run dev` again

### Issue: Environment variables not working

**Symptoms**:
- `import.meta.env.VITE_SUPABASE_URL` is `undefined`
- API calls failing

**Solution**:
1. Verify `.env` file exists in project root
2. Verify variables start with `VITE_`
3. Verify no typos in variable names
4. Restart dev server (environment variables load on start)
5. Check that values don't have extra spaces or quotes

### Issue: Database connection errors

**Symptoms**:
- "Failed to fetch" errors
- "Invalid API key" errors

**Solution**:
1. Verify Supabase URL is correct (no trailing slash)
2. Verify anon key is correct (starts with `eyJ`)
3. Check Supabase project is active (not paused)
4. Check browser console for detailed error messages
5. Verify RLS policies are enabled

### Issue: Map not loading

**Symptoms**:
- Blank map
- "Mapbox token invalid" error

**Solution**:
1. Verify Mapbox token is correct (starts with `pk.`)
2. Check token has correct scopes (`styles:read`, `fonts:read`)
3. Check token hasn't expired
4. Verify token is in `.env` file
5. Check browser console for detailed errors

### Issue: Location not working

**Symptoms**:
- "Location access denied" error
- Map doesn't center on user

**Solution**:
1. **Browser Settings**:
   - Chrome: Settings → Privacy → Site Settings → Location → Allow
   - Firefox: Settings → Privacy → Permissions → Location → Allow
   - Safari: Preferences → Websites → Location → Allow
2. **HTTPS Required** (for production):
   - Geolocation requires HTTPS in production
   - Vercel provides HTTPS automatically
   - For local testing, use `http://localhost` (allowed exception)
3. **Device Settings**:
   - Enable location services on your device
   - Enable GPS
4. **Browser Dev Tools** (for testing):
   - Chrome: F12 → Console → Three dots → Sensors → Override location

### Issue: Creatures not spawning

**Symptoms**:
- No creatures on map
- Empty spawns table

**Solution**:
1. **Check Database**:
   - Verify `creature_types` table has data (should have 5 rows)
   - Check `spawns` table for existing spawns
2. **Check Console**:
   - Look for errors in browser console
   - Check Supabase logs for database errors
3. **Wait for Spawns**:
   - Spawns generate every 5 minutes
   - Wait a few minutes and refresh
4. **Check Location**:
   - Verify location tracking is working
   - Check coordinates are valid
5. **Check PostGIS**:
   - Verify PostGIS extension is enabled
   - Test with: `SELECT PostGIS_Version();` in SQL Editor

### Issue: Catch failing

**Symptoms**:
- "You are too far away" (but you're close)
- "Creature has expired"
- "Already caught"

**Solution**:
1. **Distance Check**:
   - Make sure you're within 50 meters
   - Wait for location to update (may take a few seconds)
   - Check browser console for actual distance
2. **Expiration Check**:
   - Spawns expire after 15 minutes
   - Check `spawns` table for `expires_at` timestamp
3. **Already Caught**:
   - Spawns are one-time (deleted after catch)
   - Wait for new spawns to generate

### Issue: AI recommendations not working

**Symptoms**:
- No tips appearing
- "API key invalid" error

**Solution**:
1. **Verify API Key**:
   - Check Gemini API key is correct (starts with `AIza`)
   - Verify key is in `.env` file
2. **Check Quota**:
   - Verify you haven't exceeded free tier (1,500 requests/day)
   - Check Google Cloud Console for quota usage
3. **Check API Status**:
   - Verify Generative Language API is enabled
   - Check Google Cloud Console → APIs & Services
4. **Check Network**:
   - Verify internet connection
   - Check browser console for network errors

### Issue: Build errors on Vercel

**Symptoms**:
- Build fails on Vercel
- Deployment errors

**Solution**:
1. **Check Build Logs**:
   - Go to Vercel dashboard → Deployments → Click failed deployment
   - Check build logs for errors
2. **Common Issues**:
   - Missing environment variables (add them in Vercel dashboard)
   - Build command wrong (should be `npm run build`)
   - Node version mismatch (Vercel auto-detects, but you can set it)
3. **Test Locally**:
   - Run `npm run build` locally
   - Fix any errors before deploying

### Issue: Performance issues

**Symptoms**:
- Slow page loads
- Laggy map
- High API usage

**Solution**:
1. **Optimize Queries**:
   - Use PostGIS RPC function (more efficient)
   - Limit number of spawns queried (already limited to 50)
2. **Enable Caching**:
   - AI recommendations are cached (30 min)
   - Park detection is cached (5 min)
   - Country codes are cached (1 hour)
3. **Reduce Spawn Frequency**:
   - Increase spawn generation interval (default 5 min)
   - Reduce spawn radius (default 500m)
4. **Optimize Images**:
   - Use optimized creature images (when you add them)
   - Use WebP format
   - Lazy load images

---

## Additional Resources

### Documentation
- **Supabase Docs**: https://supabase.com/docs
- **Mapbox Docs**: https://docs.mapbox.com/
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev

### Support
- **Supabase Discord**: https://discord.supabase.com
- **Mapbox Support**: https://support.mapbox.com
- **Vercel Support**: https://vercel.com/support

### Next Steps
- Add creature images/sprites
- Implement movement speed checks (anti-cheat)
- Add sound effects
- Create more creature types
- Add gym events with rare spawns
- Implement trading system
- Add achievements/badges
- Create leaderboards

---

## Conclusion

You should now have a fully functional WanderBeasts app! If you encounter any issues not covered here, check the browser console and Supabase logs for detailed error messages.

Good luck with your hackathon! 🎮🐾

