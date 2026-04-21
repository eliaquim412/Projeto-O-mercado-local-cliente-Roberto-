-- Add is_suspended column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- Add suspended_at column to track when user was suspended
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone DEFAULT NULL;

-- Add suspended_by column to track who suspended the user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_by uuid DEFAULT NULL;