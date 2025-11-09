-- Add points field to profiles table for tracking challenge rewards
-- This migration adds a points column to track total points earned from challenges

-- Add points column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;

-- Create index on points for leaderboard queries
CREATE INDEX IF NOT EXISTS profiles_points_idx ON profiles(points DESC);

-- Update the update_challenge_progress function to add points to user profile
-- SECURITY DEFINER allows the function to bypass RLS policies when updating points
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_user_id UUID,
  p_challenge_id UUID,
  p_progress_increment INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- If completed and wasn't already completed, add to completions table and update user points
  IF v_completed AND NOT v_was_already_completed THEN
    -- Insert into challenge_completions (with conflict handling)
    INSERT INTO challenge_completions (user_id, challenge_id, reward_points)
    VALUES (p_user_id, p_challenge_id, v_challenge.reward_points)
    ON CONFLICT (user_id, challenge_id) DO NOTHING;

    -- Update user profile points
    UPDATE profiles 
    SET points = COALESCE(points, 0) + v_challenge.reward_points 
    WHERE id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_challenge_progress(UUID, UUID, INT) TO authenticated;

