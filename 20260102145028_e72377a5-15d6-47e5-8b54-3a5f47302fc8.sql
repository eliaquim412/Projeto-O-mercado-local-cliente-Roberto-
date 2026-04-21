-- Create table for store banners
CREATE TABLE public.store_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  image_desktop_url TEXT NOT NULL,
  image_mobile_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_banners ENABLE ROW LEVEL SECURITY;

-- Each store can only have one banner
CREATE UNIQUE INDEX unique_store_banner ON public.store_banners(store_id) WHERE is_active = true;

-- RLS Policies
-- Everyone can view active banners from active stores
CREATE POLICY "Active banners from active stores are viewable by everyone"
ON public.store_banners
FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = store_banners.store_id 
    AND stores.is_active = true
  )
);

-- Store owners can manage their own banners
CREATE POLICY "Store owners can manage their banners"
ON public.store_banners
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = store_banners.store_id 
    AND stores.owner_id = auth.uid()
  )
);

-- Admins can manage all banners
CREATE POLICY "Admins can manage all store banners"
ON public.store_banners
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_store_banners_updated_at
BEFORE UPDATE ON public.store_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();