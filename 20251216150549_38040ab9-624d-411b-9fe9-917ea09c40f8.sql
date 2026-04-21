-- Create product reviews table
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone"
ON public.product_reviews FOR SELECT
USING (true);

-- Users can create their own reviews
CREATE POLICY "Users can create reviews"
ON public.product_reviews FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.product_reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.product_reviews FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
ON public.product_reviews FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);

-- Create trigger for updated_at
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add rating columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_average NUMERIC(2,1) NOT NULL DEFAULT 0;

-- Function to update product rating
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC(2,1);
  count_rating INTEGER;
  target_product_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;
  
  SELECT COALESCE(AVG(rating), 0), COUNT(*) 
  INTO avg_rating, count_rating
  FROM public.product_reviews 
  WHERE product_id = target_product_id;
  
  UPDATE public.products 
  SET review_average = avg_rating, review_count = count_rating 
  WHERE id = target_product_id;
  
  RETURN NULL;
END;
$$;

-- Create trigger for product rating
CREATE TRIGGER update_product_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_product_rating();