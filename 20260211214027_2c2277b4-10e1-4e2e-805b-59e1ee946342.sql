
-- Add mobile image URL column to banners table
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS image_mobile_url text;
