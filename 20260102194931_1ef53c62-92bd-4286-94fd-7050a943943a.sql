-- Criar tabela para configurações de tema/cores do site
CREATE TABLE public.site_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (todos podem ver as configurações do site)
CREATE POLICY "Site settings are publicly readable"
ON public.site_settings
FOR SELECT
USING (true);

-- Política para admins poderem modificar
CREATE POLICY "Admins can update site settings"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert site settings"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Inserir configuração padrão de cores
INSERT INTO public.site_settings (setting_key, setting_value)
VALUES ('theme_colors', '{
    "primary": "262 83% 58%",
    "primaryForeground": "0 0% 100%",
    "secondary": "240 4.8% 95.9%",
    "secondaryForeground": "240 5.9% 10%",
    "accent": "240 4.8% 95.9%",
    "accentForeground": "240 5.9% 10%",
    "muted": "240 4.8% 95.9%",
    "mutedForeground": "240 3.8% 46.1%",
    "destructive": "0 84.2% 60.2%",
    "destructiveForeground": "0 0% 100%",
    "background": "0 0% 100%",
    "foreground": "240 10% 3.9%",
    "card": "0 0% 100%",
    "cardForeground": "240 10% 3.9%",
    "border": "240 5.9% 90%",
    "input": "240 5.9% 90%",
    "ring": "262 83% 58%"
}'::jsonb);