-- Fix orders INSERT permissions: require authenticated user + tie order to that user
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;

CREATE POLICY "Customers can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());