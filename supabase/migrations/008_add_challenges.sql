-- Challenges table - stores challenge definitions
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('collect', 'walk', 'explore')),
  target_value INT NOT NULL, -- e.g., 3 creatures, 1000 meters
  target_creature_type_id INT REFERENCES creature_types(id), -- For collect challenges
  location GEOGRAPHY(POINT, 4326) NOT NULL, -- Where challenge is located
  radius_meters FLOAT DEFAULT 500, -- Challenge area radius
  park_id TEXT, -- Optional: associated park name
  reward_points INT DEFAULT 100,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS challenges_location_idx ON challenges USING GIST(location);
CREATE INDEX IF NOT EXISTS challenges_active_idx ON challenges(active);
CREATE INDEX IF NOT EXISTS challenges_park_id_idx ON challenges(park_id);

-- User challenge progress - tracks accepted challenges and progress
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_value INT DEFAULT 0, -- Current progress (e.g., 2/3 creatures caught)
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS user_challenges_user_id_idx ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS user_challenges_challenge_id_idx ON user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS user_challenges_completed_idx ON user_challenges(completed);

-- Challenge completion history (for rewards tracking)
CREATE TABLE IF NOT EXISTS challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward_points INT DEFAULT 100,
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS challenge_completions_user_id_idx ON challenge_completions(user_id);
CREATE INDEX IF NOT EXISTS challenge_completions_challenge_id_idx ON challenge_completions(challenge_id);

-- RLS Policies
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

-- Challenges are readable by everyone
CREATE POLICY "Challenges are viewable by everyone"
  ON challenges FOR SELECT
  USING (active = TRUE);

-- Users can accept challenges
CREATE POLICY "Users can accept challenges"
  ON user_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own challenge progress
CREATE POLICY "Users can view their own challenges"
  ON user_challenges FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own challenge progress
CREATE POLICY "Users can update their own challenges"
  ON user_challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view their own completions
CREATE POLICY "Users can view their own completions"
  ON challenge_completions FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert completions (via service role or trigger)
CREATE POLICY "System can insert completions"
  ON challenge_completions FOR INSERT
  WITH CHECK (true);

-- Function to get nearby challenges
CREATE OR REPLACE FUNCTION get_nearby_challenges(
  user_lat FLOAT,
  user_lon FLOAT,
  search_radius_meters FLOAT DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  challenge_type TEXT,
  target_value INT,
  target_creature_type_id INT,
  location GEOGRAPHY,
  radius_meters FLOAT,
  park_id TEXT,
  reward_points INT,
  difficulty TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  distance_meters FLOAT,
  accepted BOOLEAN,
  progress_value INT,
  completed BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.challenge_type,
    c.target_value,
    c.target_creature_type_id,
    c.location,
    c.radius_meters,
    c.park_id,
    c.reward_points,
    c.difficulty,
    c.expires_at,
    ST_Distance(
      c.location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) AS distance_meters,
    CASE WHEN uc.id IS NOT NULL THEN TRUE ELSE FALSE END AS accepted,
    COALESCE(uc.progress_value, 0) AS progress_value,
    COALESCE(uc.completed, FALSE) AS completed
  FROM challenges c
  LEFT JOIN user_challenges uc ON uc.challenge_id = c.id AND uc.user_id = auth.uid()
  WHERE c.active = TRUE
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND ST_Distance(
      c.location::geography,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) <= search_radius_meters
  ORDER BY distance_meters ASC;
END;
$$;

-- Function to update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_user_id UUID,
  p_challenge_id UUID,
  p_progress_increment INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_challenge challenges%ROWTYPE;
  v_current_progress INT;
  v_new_progress INT;
  v_completed BOOLEAN;
  v_was_already_completed BOOLEAN;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get current progress and completion status
  SELECT progress_value, completed INTO v_current_progress, v_was_already_completed
  FROM user_challenges
  WHERE user_id = p_user_id AND challenge_id = p_challenge_id;

  -- If challenge not accepted, return false
  IF v_current_progress IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update progress
  v_new_progress := LEAST(v_current_progress + p_progress_increment, v_challenge.target_value);
  v_completed := v_new_progress >= v_challenge.target_value;

  UPDATE user_challenges
  SET 
    progress_value = v_new_progress,
    completed = v_completed,
    completed_at = CASE WHEN v_completed AND completed_at IS NULL THEN NOW() ELSE completed_at END
  WHERE user_id = p_user_id AND challenge_id = p_challenge_id;

  -- If completed and wasn't already completed, add to completions table
  IF v_completed AND NOT v_was_already_completed THEN
    INSERT INTO challenge_completions (user_id, challenge_id, reward_points)
    VALUES (p_user_id, p_challenge_id, v_challenge.reward_points)
    ON CONFLICT (user_id, challenge_id) DO NOTHING;
  END IF;

  RETURN TRUE;
END;
$$;

