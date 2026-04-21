-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL,
  min_purchase NUMERIC DEFAULT 0,
  max_discount NUMERIC, -- Max discount for percentage type
  max_uses INTEGER, -- NULL means unlimited
  uses_count INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applies_to TEXT NOT NULL DEFAULT 'all', -- 'all', 'specific_products', 'specific_categories'
  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);

-- Create coupon usage tracking table
CREATE TABLE public.coupon_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_applied NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

-- Coupons policies
CREATE POLICY "Active coupons are viewable by everyone"
ON public.coupons FOR SELECT
USING (
  is_active = true 
  AND (start_date IS NULL OR start_date <= now()) 
  AND (end_date IS NULL OR end_date >= now())
  AND (max_uses IS NULL OR uses_count < max_uses)
);

CREATE POLICY "Store owners can view all their coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM stores WHERE stores.id = coupons.store_id AND stores.owner_id = auth.uid()
));

CREATE POLICY "Store owners can manage their coupons"
ON public.coupons FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM stores WHERE stores.id = coupons.store_id AND stores.owner_id = auth.uid()
));

CREATE POLICY "Admins can view all coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all coupons"
ON public.coupons FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Coupon uses policies
CREATE POLICY "Users can view their own coupon uses"
ON public.coupon_uses FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Store owners can view their coupon uses"
ON public.coupon_uses FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coupons 
  JOIN stores ON stores.id = coupons.store_id 
  WHERE coupons.id = coupon_uses.coupon_id AND stores.owner_id = auth.uid()
));

CREATE POLICY "System can insert coupon uses"
ON public.coupon_uses FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all coupon uses"
ON public.coupon_uses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate and apply coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_store_id UUID,
  p_user_id UUID,
  p_cart_total NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_user_uses INTEGER;
  v_discount NUMERIC;
BEGIN
  -- Find the coupon
  SELECT * INTO v_coupon
  FROM coupons
  WHERE store_id = p_store_id
    AND UPPER(code) = UPPER(p_code)
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Cupom não encontrado');
  END IF;

  -- Check date validity
  IF v_coupon.start_date IS NOT NULL AND v_coupon.start_date > now() THEN
    RETURN json_build_object('valid', false, 'error', 'Cupom ainda não está válido');
  END IF;

  IF v_coupon.end_date IS NOT NULL AND v_coupon.end_date < now() THEN
    RETURN json_build_object('valid', false, 'error', 'Cupom expirado');
  END IF;

  -- Check max uses
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Cupom esgotado');
  END IF;

  -- Check minimum purchase
  IF p_cart_total < v_coupon.min_purchase THEN
    RETURN json_build_object('valid', false, 'error', 'Valor mínimo não atingido: R$' || v_coupon.min_purchase);
  END IF;

  -- Check user uses
  SELECT COUNT(*) INTO v_user_uses
  FROM coupon_uses
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_coupon.max_uses_per_user IS NOT NULL AND v_user_uses >= v_coupon.max_uses_per_user THEN
    RETURN json_build_object('valid', false, 'error', 'Você já utilizou este cupom');
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := p_cart_total * (v_coupon.discount_value / 100);
    IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
      v_discount := v_coupon.max_discount;
    END IF;
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;

  RETURN json_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'discount', v_discount,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'description', v_coupon.description
  );
END;
$$;