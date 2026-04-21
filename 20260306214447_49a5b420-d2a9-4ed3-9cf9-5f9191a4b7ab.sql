
-- Add 'municipal_admin' to enums
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'municipal_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'municipal_admin';
