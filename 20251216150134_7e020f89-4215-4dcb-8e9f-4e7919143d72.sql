-- Create favorites/wishlist table
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can add favorites
CREATE POLICY "Users can add favorites"
ON public.favorites FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can remove their favorites
CREATE POLICY "Users can remove their favorites"
ON public.favorites FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all favorites (for analytics)
CREATE POLICY "Admins can view all favorites"
ON public.favorites FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_product_id ON public.favorites(product_id);