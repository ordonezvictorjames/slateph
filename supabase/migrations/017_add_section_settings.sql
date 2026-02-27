-- Create section_settings table to store enabled/disabled state of sections
CREATE TABLE IF NOT EXISTS public.section_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.section_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read section settings
CREATE POLICY "Anyone can read section settings"
  ON public.section_settings
  FOR SELECT
  USING (true);

-- Policy: Only developers can insert section settings
CREATE POLICY "Only developers can insert section settings"
  ON public.section_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role = 'developer'
    )
  );

-- Policy: Only developers can update section settings
CREATE POLICY "Only developers can update section settings"
  ON public.section_settings
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role = 'developer'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role = 'developer'
    )
  );

-- Policy: Only developers can delete section settings
CREATE POLICY "Only developers can delete section settings"
  ON public.section_settings
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role = 'developer'
    )
  );

-- Insert default section settings
INSERT INTO public.section_settings (section_id, is_enabled) VALUES
  ('dashboard', true),
  ('courses', true),
  ('assignments', true),
  ('grades', true),
  ('schedule', true),
  ('user-management', true),
  ('course-management', true),
  ('tasks', true),
  ('profile', true),
  ('system-tracker', true)
ON CONFLICT (section_id) DO NOTHING;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_section_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_section_settings_timestamp
  BEFORE UPDATE ON public.section_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_section_settings_timestamp();
