-- Remove overly permissive policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Allow guest orders where customer_id is null OR matches the authenticated user
DROP POLICY IF EXISTS "Customers can create their own orders" ON public.orders;

CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND customer_id = auth.uid()) OR
  (auth.uid() IS NOT NULL AND customer_id IS NULL)
);