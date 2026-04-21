
-- Add CPF field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;

-- Create enum for transaction types
DO $$ BEGIN
    CREATE TYPE public.points_transaction_type AS ENUM ('earn', 'redeem', 'manual_add', 'manual_subtract');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for reward types
DO $$ BEGIN
    CREATE TYPE public.reward_type AS ENUM ('discount', 'product', 'coupon');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for redemption status
DO $$ BEGIN
    CREATE TYPE public.redemption_status AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Points Settings (Admin configurable)
CREATE TABLE public.points_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    points_per_currency numeric NOT NULL DEFAULT 10,
    min_purchase_for_points numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.points_settings (points_per_currency, min_purchase_for_points, is_active)
VALUES (10, 0, true);

-- Customer Points Balance per Store
CREATE TABLE public.customer_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    balance integer NOT NULL DEFAULT 0,
    total_earned integer NOT NULL DEFAULT 0,
    total_redeemed integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(customer_id, store_id)
);

-- Store Rewards
CREATE TABLE public.store_rewards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    type public.reward_type NOT NULL DEFAULT 'discount',
    points_required integer NOT NULL,
    discount_value numeric,
    discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    max_redemptions integer,
    redemptions_count integer NOT NULL DEFAULT 0,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Points Transactions (Audit Trail)
CREATE TABLE public.points_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type public.points_transaction_type NOT NULL,
    points integer NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    reward_id uuid REFERENCES public.store_rewards(id) ON DELETE SET NULL,
    description text,
    performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Redemption Requests
CREATE TABLE public.redemption_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    reward_id uuid NOT NULL REFERENCES public.store_rewards(id) ON DELETE CASCADE,
    points_used integer NOT NULL,
    status public.redemption_status NOT NULL DEFAULT 'pending',
    confirmed_at timestamp with time zone,
    confirmed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.points_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemption_requests ENABLE ROW LEVEL SECURITY;

-- Points Settings Policies
CREATE POLICY "Everyone can view active points settings"
ON public.points_settings FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all points settings"
ON public.points_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage points settings"
ON public.points_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Customer Points Policies
CREATE POLICY "Customers can view their own points"
ON public.customer_points FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Store owners can view their customers points"
ON public.customer_points FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = customer_points.store_id
    AND stores.owner_id = auth.uid()
));

CREATE POLICY "Store owners can manage their customers points"
ON public.customer_points FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = customer_points.store_id
    AND stores.owner_id = auth.uid()
));

CREATE POLICY "System can insert customer points"
ON public.customer_points FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can view all customer points"
ON public.customer_points FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all customer points"
ON public.customer_points FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Store Rewards Policies
CREATE POLICY "Active rewards are viewable by everyone"
ON public.store_rewards FOR SELECT
USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "Store owners can view all their rewards"
ON public.store_rewards FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_rewards.store_id
    AND stores.owner_id = auth.uid()
));

CREATE POLICY "Store owners can manage their rewards"
ON public.store_rewards FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = store_rewards.store_id
    AND stores.owner_id = auth.uid()
));

CREATE POLICY "Admins can view all rewards"
ON public.store_rewards FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all rewards"
ON public.store_rewards FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Points Transactions Policies
CREATE POLICY "Customers can view their own transactions"
ON public.points_transactions FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Store owners can view their store transactions"
ON public.points_transactions FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = points_transactions.store_id
    AND stores.owner_id = auth.uid()
));

CREATE POLICY "Store owners can insert transactions for their store"
ON public.points_transactions FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = points_transactions.store_id
    AND stores.owner_id = auth.uid()
));

CREATE POLICY "System can insert transactions"
ON public.points_transactions FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
ON public.points_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all transactions"
ON public.points_transactions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Redemption Requests Policies
CREATE POLICY "Customers can view their own requests"
ON public.redemption_requests FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Customers can create requests"
ON public.redemption_requests FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Store owners can view their store requests"
ON public.redemption_requests FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = redemption_requests.store_id
    AND stores.owner_id = auth.uid()
));

CREATE POLICY "Store owners can manage their store requests"
ON public.redemption_requests FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = redemption_requests.store_id
    AND stores.owner_id = auth.uid()
));

CREATE POLICY "Admins can view all requests"
ON public.redemption_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all requests"
ON public.redemption_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_points_settings_updated_at
BEFORE UPDATE ON public.points_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_points_updated_at
BEFORE UPDATE ON public.customer_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_rewards_updated_at
BEFORE UPDATE ON public.store_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update customer points balance
CREATE OR REPLACE FUNCTION public.update_customer_points_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert or update customer_points record
    INSERT INTO public.customer_points (customer_id, store_id, balance, total_earned, total_redeemed)
    VALUES (
        NEW.customer_id,
        NEW.store_id,
        CASE WHEN NEW.type IN ('earn', 'manual_add') THEN NEW.points ELSE -NEW.points END,
        CASE WHEN NEW.type IN ('earn', 'manual_add') THEN NEW.points ELSE 0 END,
        CASE WHEN NEW.type IN ('redeem', 'manual_subtract') THEN NEW.points ELSE 0 END
    )
    ON CONFLICT (customer_id, store_id)
    DO UPDATE SET
        balance = customer_points.balance + 
            CASE WHEN NEW.type IN ('earn', 'manual_add') THEN NEW.points ELSE -NEW.points END,
        total_earned = customer_points.total_earned + 
            CASE WHEN NEW.type IN ('earn', 'manual_add') THEN NEW.points ELSE 0 END,
        total_redeemed = customer_points.total_redeemed + 
            CASE WHEN NEW.type IN ('redeem', 'manual_subtract') THEN NEW.points ELSE 0 END,
        updated_at = now();
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-update balance on transaction insert
CREATE TRIGGER update_points_balance_on_transaction
AFTER INSERT ON public.points_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_points_balance();
