-- Add column for stores to opt-in/out of points program
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS points_program_enabled BOOLEAN NOT NULL DEFAULT true;