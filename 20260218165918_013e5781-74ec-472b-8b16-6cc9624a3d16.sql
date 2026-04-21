
-- Table for admin-managed system links
CREATE TABLE public.system_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system links" ON public.system_links
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all system links" ON public.system_links
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Active system links viewable by authenticated users" ON public.system_links
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE TRIGGER update_system_links_updated_at
  BEFORE UPDATE ON public.system_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for merchant access requests
CREATE TABLE public.system_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_link_id UUID NOT NULL REFERENCES public.system_links(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  access_login TEXT,
  access_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(system_link_id, merchant_id)
);

ALTER TABLE public.system_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all access requests" ON public.system_access_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all access requests" ON public.system_access_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can create their own requests" ON public.system_access_requests
  FOR INSERT WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can view their own requests" ON public.system_access_requests
  FOR SELECT USING (merchant_id = auth.uid());

CREATE TRIGGER update_system_access_requests_updated_at
  BEFORE UPDATE ON public.system_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
