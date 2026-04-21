-- Adicionar campo de valor de frete na tabela stores
ALTER TABLE public.stores 
ADD COLUMN shipping_fee numeric DEFAULT 0,
ADD COLUMN free_shipping boolean DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN public.stores.shipping_fee IS 'Valor do frete definido pelo lojista';
COMMENT ON COLUMN public.stores.free_shipping IS 'Se a loja oferece frete grátis';