ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS cta_button_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cta_button_title TEXT,
  ADD COLUMN IF NOT EXISTS cta_button_link TEXT;