-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  -- Address
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_zipcode TEXT,
  -- Location
  city_id UUID REFERENCES public.cities(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  -- Stats
  followers_count INTEGER NOT NULL DEFAULT 0,
  rating_average DECIMAL(2, 1) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  -- Stats
  views_count INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique slug per store
  UNIQUE(store_id, slug)
);

-- Create store followers table
CREATE TABLE public.store_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- Create store reviews table
CREATE TABLE public.store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- RLS for categories (public read)
CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for stores
CREATE POLICY "Active stores are viewable by everyone"
ON public.stores FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Owners can view their own stores"
ON public.stores FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can update their own stores"
ON public.stores FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their own stores"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all stores"
ON public.stores FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for products
CREATE POLICY "Active products from active stores are viewable"
ON public.products FOR SELECT
TO anon, authenticated
USING (
  status = 'active' AND 
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND is_active = true)
);

CREATE POLICY "Store owners can view their products"
ON public.products FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

CREATE POLICY "Store owners can manage their products"
ON public.products FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

CREATE POLICY "Admins can manage all products"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for store_followers
CREATE POLICY "Followers are viewable by everyone"
ON public.store_followers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can follow stores"
ON public.store_followers FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unfollow stores"
ON public.store_followers FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS for store_reviews
CREATE POLICY "Reviews are viewable by everyone"
ON public.store_reviews FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can create reviews"
ON public.store_reviews FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
ON public.store_reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
ON public.store_reviews FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update store followers count
CREATE OR REPLACE FUNCTION public.update_store_followers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stores SET followers_count = followers_count + 1 WHERE id = NEW.store_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stores SET followers_count = followers_count - 1 WHERE id = OLD.store_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_store_follower_change
  AFTER INSERT OR DELETE ON public.store_followers
  FOR EACH ROW EXECUTE FUNCTION public.update_store_followers_count();

-- Function to update store rating
CREATE OR REPLACE FUNCTION public.update_store_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating DECIMAL(2, 1);
  count_rating INTEGER;
  target_store_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_store_id := OLD.store_id;
  ELSE
    target_store_id := NEW.store_id;
  END IF;
  
  SELECT COALESCE(AVG(rating), 0), COUNT(*) 
  INTO avg_rating, count_rating
  FROM public.store_reviews 
  WHERE store_id = target_store_id;
  
  UPDATE public.stores 
  SET rating_average = avg_rating, rating_count = count_rating 
  WHERE id = target_store_id;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_store_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.store_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_store_rating();

-- Insert initial categories
INSERT INTO public.categories (name, slug, icon) VALUES
  ('Eletrônicos', 'eletronicos', 'Laptop'),
  ('Moda', 'moda', 'Shirt'),
  ('Casa e Decoração', 'casa-decoracao', 'Home'),
  ('Esportes', 'esportes', 'Dumbbell'),
  ('Beleza e Saúde', 'beleza-saude', 'Heart'),
  ('Automotivo', 'automotivo', 'Car'),
  ('Alimentos', 'alimentos', 'UtensilsCrossed'),
  ('Serviços', 'servicos', 'Wrench');