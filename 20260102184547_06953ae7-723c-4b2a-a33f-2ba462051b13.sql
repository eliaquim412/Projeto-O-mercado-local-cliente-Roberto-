-- Allow authenticated customers to create orders linked to themselves
CREATE POLICY "Customers can create their own orders"
ON public.orders
FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Also allow unauthenticated orders (for guest checkout) - the store owner can see them
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (true);