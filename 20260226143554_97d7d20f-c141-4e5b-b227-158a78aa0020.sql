
-- Testimonials table
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Partner logos table
CREATE TABLE public.partner_logos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for testimonials
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Testimonials are viewable by everyone" ON public.testimonials
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all testimonials" ON public.testimonials
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage testimonials" ON public.testimonials
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for partner_logos
ALTER TABLE public.partner_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner logos are viewable by everyone" ON public.partner_logos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all partner logos" ON public.partner_logos
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage partner logos" ON public.partner_logos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
