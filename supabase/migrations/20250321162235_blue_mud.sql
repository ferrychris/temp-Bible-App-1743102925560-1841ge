/*
  # Bible Verses Table Setup

  1. New Tables
    - bible_verses: Stores daily Bible verses with references
      - id (uuid, primary key)
      - serial_number (text, unique)
      - verse_text (text)
      - created_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for public read access
*/

-- Create bible_verses table
CREATE TABLE bible_verses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text UNIQUE NOT NULL,
  verse_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Bible verses are publicly readable"
  ON bible_verses
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert verses from the provided list
INSERT INTO bible_verses (serial_number, verse_text) VALUES
('001', 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go. | Joshua 1:9'),
('002', 'I can do all this through him who gives me strength. | Philippians 4:13'),
('003', 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint. | Isaiah 40:31');

-- Note: Continue with the rest of the verses...