
-- 1. Create municipal_profiles table
CREATE TABLE public.municipal_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE NOT NULL,
  logo_url text,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(city_id)
);

ALTER TABLE public.municipal_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Municipal admins can manage their own profile" ON public.municipal_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all municipal profiles" ON public.municipal_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active municipal profiles are viewable by everyone" ON public.municipal_profiles
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- 2. Create municipal_links table
CREATE TABLE public.municipal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipal_profile_id uuid REFERENCES public.municipal_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  icon_url text,
  link_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.municipal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Municipal admins can manage their own links" ON public.municipal_links
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.municipal_profiles WHERE id = municipal_links.municipal_profile_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.municipal_profiles WHERE id = municipal_links.municipal_profile_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage all municipal links" ON public.municipal_links
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active municipal links are viewable by everyone" ON public.municipal_links
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- 3. Create municipal_services table
CREATE TABLE public.municipal_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipal_profile_id uuid REFERENCES public.municipal_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  icon text DEFAULT 'FileText',
  link_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.municipal_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Municipal admins can manage their own services" ON public.municipal_services
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.municipal_profiles WHERE id = municipal_services.municipal_profile_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.municipal_profiles WHERE id = municipal_services.municipal_profile_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage all municipal services" ON public.municipal_services
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active municipal services are viewable by everyone" ON public.municipal_services
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- 4. Create municipal_events table
CREATE TABLE public.municipal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipal_profile_id uuid REFERENCES public.municipal_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  end_date timestamptz,
  location text,
  image_url text,
  link_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.municipal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Municipal admins can manage their own events" ON public.municipal_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.municipal_profiles WHERE id = municipal_events.municipal_profile_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.municipal_profiles WHERE id = municipal_events.municipal_profile_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage all municipal events" ON public.municipal_events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active municipal events are viewable by everyone" ON public.municipal_events
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- 5. Create municipal_polls table
CREATE TABLE public.municipal_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipal_profile_id uuid REFERENCES public.municipal_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.municipal_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Municipal admins can manage their own polls" ON public.municipal_polls
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.municipal_profiles WHERE id = municipal_polls.municipal_profile_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.municipal_profiles WHERE id = municipal_polls.municipal_profile_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage all municipal polls" ON public.municipal_polls
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active municipal polls are viewable by everyone" ON public.municipal_polls
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

-- 6. Create municipal_poll_options table
CREATE TABLE public.municipal_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.municipal_polls(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.municipal_poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Municipal admins can manage their poll options" ON public.municipal_poll_options
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.municipal_polls p
    JOIN public.municipal_profiles mp ON mp.id = p.municipal_profile_id
    WHERE p.id = municipal_poll_options.poll_id AND mp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.municipal_polls p
    JOIN public.municipal_profiles mp ON mp.id = p.municipal_profile_id
    WHERE p.id = municipal_poll_options.poll_id AND mp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all poll options" ON public.municipal_poll_options
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Poll options are viewable by everyone" ON public.municipal_poll_options
  FOR SELECT TO anon, authenticated USING (true);

-- 7. Create municipal_poll_votes table
CREATE TABLE public.municipal_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.municipal_polls(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES public.municipal_poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.municipal_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can vote once per poll" ON public.municipal_poll_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own votes" ON public.municipal_poll_votes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Municipal admins can view votes on their polls" ON public.municipal_poll_votes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.municipal_polls p
    JOIN public.municipal_profiles mp ON mp.id = p.municipal_profile_id
    WHERE p.id = municipal_poll_votes.poll_id AND mp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all votes" ON public.municipal_poll_votes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. Function to get vote counts publicly
CREATE OR REPLACE FUNCTION public.get_poll_vote_counts(p_poll_id uuid)
RETURNS TABLE(option_id uuid, vote_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT option_id, COUNT(*) as vote_count
  FROM public.municipal_poll_votes
  WHERE poll_id = p_poll_id
  GROUP BY option_id;
$$;

-- 9. Storage policies for municipal/ folder
CREATE POLICY "Municipal admins can upload to municipal folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = 'municipal' AND public.has_role(auth.uid(), 'municipal_admin'));

CREATE POLICY "Municipal admins can update municipal uploads" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = 'municipal' AND public.has_role(auth.uid(), 'municipal_admin'));

CREATE POLICY "Municipal admins can delete municipal uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = 'municipal' AND public.has_role(auth.uid(), 'municipal_admin'));

-- 10. Updated_at trigger
CREATE TRIGGER update_municipal_profiles_updated_at
  BEFORE UPDATE ON public.municipal_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
