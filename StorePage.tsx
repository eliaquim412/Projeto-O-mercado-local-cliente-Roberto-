import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, Phone, MessageCircle, Star, Users, 
  Heart, Share2, ArrowLeft, Store as StoreIcon,
  Grid, List, ArrowUpDown, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProductCard from '@/components/store/ProductCard';
import StoreReviews from '@/components/store/StoreReviews';
import { ChatButton } from '@/components/chat/ChatButton';
import StoreCategoriesWithBanner from '@/components/store/StoreCategoriesWithBanner';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'rating', label: 'Melhor avaliação' },
  { value: 'best_sellers', label: 'Mais vendidos' },
];

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  followers_count: number;
  rating_average: number;
  rating_count: number;
  is_verified: boolean;
  background_color: string | null;
  cta_button_enabled: boolean;
  cta_button_title: string | null;
  cta_button_link: string | null;
  city: { name: string; state: string } | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  images: string[];
  stock: number;
  review_count?: number;
  review_average?: number;
  sales_count?: number;
  created_at?: string;
  category_id: string | null;
  category: { id: string; name: string; slug: string; icon: string | null } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort products based on search, category and sort option
  const sortedProducts = useMemo(() => {
    // First filter by search term
    let filtered = searchTerm.trim()
      ? products.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : products;
    
    // Then filter by category
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }
    
    // Then sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => (b.review_average || 0) - (a.review_average || 0));
      case 'best_sellers':
        return sorted.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
      case 'recent':
      default:
        return sorted.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }
  }, [products, sortBy, selectedCategory, searchTerm]);

  useEffect(() => {
    if (slug) {
      fetchStore();
    }
  }, [slug]);

  useEffect(() => {
    if (store && user) {
      checkFollowing();
    }
  }, [store, user]);

  const fetchStore = async () => {
    setLoading(true);
    
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select(`
        *,
        city:cities(name, state)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (storeError || !storeData) {
      setLoading(false);
      return;
    }

    setStore(storeData as unknown as Store);

    // Fetch products with review data and category info
    const { data: productsData } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug, icon)
      `)
      .eq('store_id', storeData.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const fetchedProducts = (productsData as unknown as Product[]) || [];
    setProducts(fetchedProducts);

    // Extract unique categories from products
    const uniqueCategories: Category[] = [];
    const categoryIds = new Set<string>();
    fetchedProducts.forEach(product => {
      if (product.category && !categoryIds.has(product.category.id)) {
        categoryIds.add(product.category.id);
        uniqueCategories.push(product.category);
      }
    });
    setCategories(uniqueCategories.sort((a, b) => a.name.localeCompare(b.name)));
    
    setLoading(false);
  };

  const checkFollowing = async () => {
    if (!store || !user) return;

    const { data } = await supabase
      .from('store_followers')
      .select('id')
      .eq('store_id', store.id)
      .eq('user_id', user.id)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para seguir lojas.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!store) return;

    if (isFollowing) {
      await supabase
        .from('store_followers')
        .delete()
        .eq('store_id', store.id)
        .eq('user_id', user.id);
      
      setIsFollowing(false);
      setStore(prev => prev ? { ...prev, followers_count: prev.followers_count - 1 } : null);
      toast({ title: 'Você deixou de seguir esta loja.' });
    } else {
      await supabase
        .from('store_followers')
        .insert({ store_id: store.id, user_id: user.id });
      
      setIsFollowing(true);
      setStore(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);
      toast({ title: 'Agora você está seguindo esta loja!' });
    }
  };

  const handleWhatsApp = () => {
    if (!store?.whatsapp) return;
    const phone = store.whatsapp.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá! Vi sua loja "${store.name}" no marketplace e gostaria de saber mais.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: store?.name,
        text: store?.description || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copiado!' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando loja...</div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 container px-4 text-center">
          <StoreIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground mb-6">Esta loja não existe ou foi desativada.</p>
          <Button onClick={() => navigate('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${store.background_color ? '' : 'bg-background'}`} style={store.background_color ? { backgroundColor: store.background_color } : undefined}>
      <Navigation />
      
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-muted">
        {store.cover_url ? (
          <img 
            src={store.cover_url} 
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/20 to-secondary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="absolute top-4 left-4 bg-background/50 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {/* Share Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Store Header */}
      <div className="container px-4 -mt-16 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-muted overflow-hidden border-4 border-background">
                {store.logo_url ? (
                  <img 
                    src={store.logo_url} 
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <StoreIcon className="w-12 h-12 text-primary" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold">{store.name}</h1>
                    {store.is_verified && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary">
                        Verificado
                      </Badge>
                    )}
                  </div>
                  
                  {store.city && (
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {store.city.name}, {store.city.state}
                    </p>
                  )}
                </div>

                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={handleFollow}
                  className={isFollowing ? '' : 'button-gradient'}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? 'Seguindo' : 'Seguir'}
                </Button>
              </div>

              {store.description && (
                <p className="text-muted-foreground mt-3 line-clamp-2">{store.description}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  <span className="font-semibold">{Number(store.rating_average).toFixed(1)}</span>
                  <span className="text-muted-foreground">({store.rating_count} avaliações)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span>{store.followers_count} seguidores</span>
                </div>
              </div>

              {/* Contact Buttons */}
              <div className="flex flex-wrap gap-3 mt-4">
                {store.whatsapp && (
                  <Button onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
                {store.phone && (
                  <Button variant="outline" asChild>
                    <a href={`tel:${store.phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      Ligar
                    </a>
                  </Button>
                )}
                {store.cta_button_enabled && store.cta_button_title && store.cta_button_link && (
                  <Button
                    asChild
                    className="relative button-gradient animate-pulse hover:animate-none"
                  >
                    <a href={store.cta_button_link} target="_blank" rel="noopener noreferrer">
                      {store.cta_button_title}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Categories Bar */}
      <div className="container px-4 pt-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar produtos nesta loja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        {/* Categories + Banner */}
        <StoreCategoriesWithBanner
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
          storeId={store.id}
        />
      </div>

      {/* Content */}
      <div className="container px-4 py-6">
        <Tabs defaultValue="products" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="products">Produtos ({products.length})</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações ({store.rating_count})</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] bg-card/50 border-border/50">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Buttons */}
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-muted' : ''}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-muted' : ''}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value="products">
            {sortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <StoreIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum produto ainda</h3>
                <p className="text-muted-foreground">Esta loja ainda não cadastrou produtos.</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {sortedProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    store={{ ...store, id: store.id, slug: store.slug }}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            <StoreReviews storeId={store.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Button */}
      <ChatButton 
        storeId={store.id} 
        storeName={store.name} 
        storeLogo={store.logo_url} 
      />

      <Footer />
    </div>
  );
}
