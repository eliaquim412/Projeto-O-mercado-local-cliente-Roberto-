
-- Create a security definer function for store owners to search customers by CPF
-- This avoids exposing all profiles while allowing legitimate business needs
CREATE OR REPLACE FUNCTION public.search_customer_by_cpf(p_cpf text, p_store_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  cpf text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller owns the store
  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE stores.id = p_store_id AND stores.owner_id = auth.uid()
  ) AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.cpf, p.phone
  FROM profiles p
  WHERE p.cpf = p_cpf
  LIMIT 1;
END;
$$;

-- Allow store owners to view profiles of customers in their points program
CREATE POLICY "Store owners can view their customers profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_points cp
    JOIN stores s ON s.id = cp.store_id
    WHERE cp.customer_id = profiles.id
    AND s.owner_id = auth.uid()
  )
);
