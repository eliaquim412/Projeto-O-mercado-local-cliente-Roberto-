-- Create storage bucket for store assets
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true);

-- RLS policies for store-assets bucket
CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'store-assets');

CREATE POLICY "Store owners can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners can update their assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners can delete their assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.stores WHERE owner_id = auth.uid()
  )
);

-- Create orders table for tracking
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  -- Order details
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  notes TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS for orders
CREATE POLICY "Store owners can view their orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

CREATE POLICY "Store owners can manage their orders"
ON public.orders FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid())
);

CREATE POLICY "Customers can view their own orders"
ON public.orders FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Trigger for orders updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();