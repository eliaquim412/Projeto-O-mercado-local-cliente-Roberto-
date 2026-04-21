-- Fix RLS policies for profiles table - make admin policy PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS policies for stores table - make admin policy PERMISSIVE  
DROP POLICY IF EXISTS "Admins can view all stores including inactive" ON public.stores;
CREATE POLICY "Admins can view all stores including inactive" 
ON public.stores 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS policies for banners table - make admin policy PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all banners" ON public.banners;
CREATE POLICY "Admins can view all banners" 
ON public.banners 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));