import React, { useState, useEffect } from 'react';
import { Ticket, Tag, Store, MapPin, SearchX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCity } from '@/hooks/useCity';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import cuponsBannerFallback from '@/assets/banners/cupons-banner.jpg';

interface CouponWithStore {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase: number | null;
  max_discount: number | null;
  end_date: string | null;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
}

export default function DescontosPage() {
  const { selectedCity } = useCity();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const unavailablePromo = searchParams.get('unavailable');
  const [coupons, setCoupons] = useState<CouponWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerUrl, setBannerUrl] = useState<string>(cuponsBannerFallback);

  useEffect(() => {
    fetchBanner();
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [selectedCity]);

  const fetchBanner = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('banners')
      .select('image_url')
      .eq('position', 'descontos')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('display_order')
      .limit(1);

    if (data && data.length > 0) {
      setBannerUrl(data[0].image_url);
    }
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      // Build query for active coupons joined with stores
      let query = supabase
        .from('coupons')
        .select(`
          id, code, description, discount_type, discount_value,
          min_purchase, max_discount, end_date, store_id,
          stores!inner (name, slug, logo_url, city_id, is_active)
        `)
        .eq('is_active', true)
        .eq('stores.is_active', true);

      if (selectedCity) {
        query = query.eq('stores.city_id', selectedCity.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching coupons:', error);
        setCoupons([]);
        return;
      }

      const now = new Date();
      const mapped: CouponWithStore[] = (data || [])
        .filter((c: any) => {
          if (c.end_date && new Date(c.end_date) < now) return false;
          if (c.start_date && new Date(c.start_date) > now) return false;
          return true;
        })
        .map((c: any) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          discount_type: c.discount_type,
          discount_value: c.discount_value,
          min_purchase: c.min_purchase,
          max_discount: c.max_discount,
          end_date: c.end_date,
          store_id: c.store_id,
          store_name: c.stores.name,
          store_slug: c.stores.slug,
          store_logo: c.stores.logo_url,
        }));

      setCoupons(mapped);
    } catch (err) {
      console.error('Error:', err);
      setCoupons([]);
    }
    setLoading(false);
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') return `${value}% OFF`;
    return `R$${value.toFixed(2)} OFF`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container px-4 pt-28 pb-16">
        {unavailablePromo && (
          <div className="mb-8 rounded-2xl border border-border bg-muted/50 p-8 text-center">
            <SearchX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Promoção indisponível no momento</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Nenhuma loja está oferecendo a condição <span className="font-semibold text-foreground">"{unavailablePromo}"</span> neste momento.
              Fique de olho! Novas promoções podem surgir a qualquer momento.
            </p>
            <Button variant="outline" onClick={() => setSearchParams({})}>
              Ver todos os cupons
            </Button>
          </div>
        )}

        {/* Banner */}
        <div className="rounded-xl overflow-hidden mb-8">
          <img src={bannerUrl} alt="Cupons de Desconto" className="w-full h-[120px] sm:h-[160px] lg:h-[200px] object-cover" />
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Ticket className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Descontos</h1>
        </div>

        {selectedCity ? (
          <p className="text-muted-foreground mb-8 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Mostrando cupons de lojas em <span className="font-medium text-foreground">{selectedCity.name}</span>
          </p>
        ) : (
          <p className="text-muted-foreground mb-8">
            Selecione uma cidade na barra superior para ver os cupons disponíveis na sua região.
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum cupom disponível</h2>
            <p className="text-muted-foreground">
              {selectedCity
                ? `Não há cupons ativos em ${selectedCity.name} no momento.`
                : 'Selecione uma cidade para ver os cupons disponíveis.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {coupons.map((coupon) => (
              <Card key={coupon.id} className="overflow-hidden hover:shadow-lg transition-shadow border-dashed border-2">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    {coupon.store_logo ? (
                      <img src={coupon.store_logo} alt={coupon.store_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{coupon.store_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-sm font-semibold px-2 py-0.5">
                      {formatDiscount(coupon.discount_type, coupon.discount_value)}
                    </Badge>
                  </div>

                  <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3 flex items-center justify-center border border-dashed border-border">
                    <code className="text-sm font-mono font-bold tracking-wider">{coupon.code}</code>
                  </div>

                  {coupon.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{coupon.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                    {coupon.min_purchase && (
                      <span>Mín: R${coupon.min_purchase.toFixed(2)}</span>
                    )}
                    {coupon.end_date && (
                      <span>Até: {new Date(coupon.end_date).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/loja/${coupon.store_slug}`)}
                  >
                    <Store className="w-4 h-4 mr-1" />
                    Visitar Loja
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
