/*
  # Create The Incubator - Social Innovation Hub

  1. New Tables
    - `incubator_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `content` (text)
      - `image_url` (text, nullable)
      - `tags` (text array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `incubator_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references incubator_posts)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamptz)
    
    - `incubator_reactions`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references incubator_posts)
      - `user_id` (uuid, references profiles)
      - `reaction_type` (text: 'like', 'love', 'innovative', 'interesting')
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id, reaction_type)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can:
      - Read all posts, comments, and reactions
      - Create their own posts, comments, and reactions
      - Update/delete their own posts and comments
      - Delete their own reactions
*/

-- Create incubator_posts table
CREATE TABLE IF NOT EXISTS incubator_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create incubator_comments table
CREATE TABLE IF NOT EXISTS incubator_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES incubator_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create incubator_reactions table
CREATE TABLE IF NOT EXISTS incubator_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES incubator_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'innovative', 'interesting')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incubator_posts_user_id ON incubator_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_incubator_posts_created_at ON incubator_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incubator_posts_tags ON incubator_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_incubator_comments_post_id ON incubator_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_incubator_comments_user_id ON incubator_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_incubator_reactions_post_id ON incubator_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_incubator_reactions_user_id ON incubator_reactions(user_id);

-- Enable Row Level Security
ALTER TABLE incubator_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubator_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubator_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incubator_posts
CREATE POLICY "Anyone can view posts"
  ON incubator_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create posts"
  ON incubator_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON incubator_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON incubator_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for incubator_comments
CREATE POLICY "Anyone can view comments"
  ON incubator_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON incubator_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON incubator_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON incubator_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for incubator_reactions
CREATE POLICY "Anyone can view reactions"
  ON incubator_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reactions"
  ON incubator_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON incubator_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incubator_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_incubator_posts_updated_at ON incubator_posts;
CREATE TRIGGER update_incubator_posts_updated_at
  BEFORE UPDATE ON incubator_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_incubator_post_updated_at();
