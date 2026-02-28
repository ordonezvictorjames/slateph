-- Create subject_resources table
CREATE TABLE IF NOT EXISTS subject_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  resource_url TEXT NOT NULL,
  resource_type VARCHAR(50) NOT NULL DEFAULT 'link', -- 'link', 'file', 'document'
  description TEXT,
  file_size BIGINT, -- Size in bytes for uploaded files
  file_type VARCHAR(100), -- MIME type for uploaded files
  order_index INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subject_resources_subject_id ON subject_resources(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_resources_status ON subject_resources(status);
CREATE INDEX IF NOT EXISTS idx_subject_resources_order ON subject_resources(subject_id, order_index);

-- Add RLS policies
ALTER TABLE subject_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view active resources
CREATE POLICY "Allow authenticated users to view resources"
  ON subject_resources
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow admins and developers to insert resources
CREATE POLICY "Allow admins and developers to insert resources"
  ON subject_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Policy: Allow admins and developers to update resources
CREATE POLICY "Allow admins and developers to update resources"
  ON subject_resources
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Policy: Allow admins and developers to delete resources
CREATE POLICY "Allow admins and developers to delete resources"
  ON subject_resources
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subject_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_subject_resources_updated_at
  BEFORE UPDATE ON subject_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_subject_resources_updated_at();

-- Add comment to table
COMMENT ON TABLE subject_resources IS 'Stores resources (links, files, documents) associated with subjects';
