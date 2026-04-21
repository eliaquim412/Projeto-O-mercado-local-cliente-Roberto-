-- Add admin policies for full access to all tables

-- Profiles: Admin can view all
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Stores: Admin view all (including inactive)
CREATE POLICY "Admins can view all stores including inactive"
ON public.stores FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Products: Admin can view all
CREATE POLICY "Admins can view all products"
ON public.products FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Orders: Admin can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all orders"
ON public.orders FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Cities: Admin can view all cities (including inactive)
CREATE POLICY "Admins can view all cities"
ON public.cities FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Categories: Admin can view all categories
CREATE POLICY "Admins can view all categories"
ON public.categories FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));