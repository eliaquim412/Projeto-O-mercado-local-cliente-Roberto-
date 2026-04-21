import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ChevronDown, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useCity } from '@/hooks/useCity';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CitySelectorModal from '@/components/home/CitySelectorModal';
import SearchBar from '@/components/home/SearchBar';
import SearchFilters from '@/components/home/SearchFilters';
import CategoriesBar from '@/components/home/CategoriesBar';
import FeaturedStores from '@/components/home/FeaturedStores';
import BannerCarousel from '@/components/home/BannerCarousel';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  rating_average: number;
  rating_count: number;
  followers_count: number;
  is_verified: boolean;
  city: { name: string; state: string } | null;
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedCity, setSelectedCity, cities, loading: loadingCity } = useCity();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [recentStores, setRecentStores] = useState<Store[]>([]);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // URL params for search and filters
  const searchQuery = searchParams.get('busca') || '';
  const sortBy = searchParams.get('ordenar') || 'recent';
  const minRating = searchParams.get('avaliacao') || '';
  
  // Check if any filter/search is active
  const hasActiveFilters = searchQuery || minRating || selectedCategory;

  // Read category from URL and sync with state
  useEffect(() => {
    fetchCategories();
  }, []);

  // Sync URL param with selected category
  useEffect(() => {
    const categorySlug = searchParams.get('categoria');
    if (categorySlug && categories.length > 0) {
      const category = categories.find(c => c.slug === categorySlug);
      if (category) {
        setSelectedCategory(category.id);
      } else {
        setSelectedCategory(null);
      }
    } else if (!categorySlug) {
      setSelectedCategory(null);
    }
  }, [searchParams, categories]);

  useEffect(() => {
    if (selectedCity) {
      fetchData();
    }
  }, [selectedCity, selectedCategory, searchQuery, sortBy, minRating]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setCategories((data as Category[]) || []);
  };

  const fetchData = async () => {
    if (!selectedCity) return;
    
    setLoading(true);

    // Fetch featured stores (verified + high rating) - only when not filtering
    if (!hasActiveFilters) {
      const { data: featuredStoresData } = await supabase
        .from('stores')
        .select(`*, city:cities(name, state)`)
        .eq('city_id', selectedCity.id)
        .eq('is_active', true)
        .order('rating_average', { ascending: false })
        .limit(6);

      setFeaturedStores((featuredStoresData as unknown as Store[]) || []);

      // Fetch recent stores
      const { data: recentStoresData } = await supabase
        .from('stores')
        .select(`*, city:cities(name, state)`)
        .eq('city_id', selectedCity.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      setRecentStores((recentStoresData as unknown as Store[]) || []);
    } else {
      setFeaturedStores([]);
      setRecentStores([]);
    }

    // Fetch all stores with filters
    let allQuery = supabase
      .from('stores')
      .select(`*, city:cities(name, state)`)
      .eq('city_id', selectedCity.id)
      .eq('is_active', true);

    // Apply text search - search by store name or by products they sell
    if (searchQuery) {
      // First try to find stores by name
      const { data: storesByName } = await supabase
        .from('stores')
        .select(`*, city:cities(name, state)`)
        .eq('city_id', selectedCity.id)
        .eq('is_active', true)
        .ilike('name', `%${searchQuery}%`);
      
      // Also find stores that have products matching the search
      const { data: productMatches } = await supabase
        .from('products')
        .select('store_id')
        .eq('status', 'active')
        .ilike('name', `%${searchQuery}%`);
      
      const storeIdsFromProducts = productMatches?.map(p => p.store_id) || [];
      
      // Combine results
      const combinedStoreIds = new Set([
        ...(storesByName?.map(s => s.id) || []),
        ...storeIdsFromProducts
      ]);
      
      if (combinedStoreIds.size > 0) {
        allQuery = allQuery.in('id', Array.from(combinedStoreIds));
      } else {
        // No matches, set empty and return early
        setAllStores([]);
        setLoading(false);
        return;
      }
    }

    // Apply category filter - find stores that have products in this category
    if (selectedCategory) {
      const { data: productMatches } = await supabase
        .from('products')
        .select('store_id')
        .eq('status', 'active')
        .eq('category_id', selectedCategory);
      
      const storeIds = [...new Set(productMatches?.map(p => p.store_id) || [])];
      
      if (storeIds.length > 0) {
        allQuery = allQuery.in('id', storeIds);
      } else {
        setAllStores([]);
        setLoading(false);
        return;
      }
    }

    // Apply rating filter
    if (minRating) {
      allQuery = allQuery.gte('rating_average', parseFloat(minRating));
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        allQuery = allQuery.order('rating_average', { ascending: false });
        break;
      case 'followers':
        allQuery = allQuery.order('followers_count', { ascending: false });
        break;
      case 'recent':
      default:
        allQuery = allQuery.order('created_at', { ascending: false });
        break;
    }

    allQuery = allQuery.limit(hasActiveFilters ? 50 : 20);

    const { data: allStoresData } = await allQuery;
    setAllStores((allStoresData as unknown as Store[]) || []);

    setLoading(false);
  };

  if (loadingCity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Show city selector modal if no city selected
  if (!selectedCity) {
    return <CitySelectorModal open={true} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-24 pb-8 px-4">
        <div className="container max-w-6xl mx-auto">
          {/* City Selector */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {selectedCity.name}, {selectedCity.state}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto">
                {cities.map((city) => (
                  <DropdownMenuItem
                    key={city.id}
                    onClick={() => setSelectedCity(city)}
                    className={city.id === selectedCity.id ? 'bg-primary/10' : ''}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {city.name}, {city.state}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-8"
          >
            <SearchBar />
          </motion.div>

          {/* Welcome Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Encontre as melhores lojas em{' '}
              <span className="text-primary">{selectedCity.name}</span>
            </h1>
            <p className="text-muted-foreground">
              Lojas perto de você
            </p>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <CategoriesBar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={(categoryId) => {
                const currentParams = Object.fromEntries(searchParams.entries());
                if (categoryId) {
                  const category = categories.find(c => c.id === categoryId);
                  if (category) {
                    setSearchParams({ ...currentParams, categoria: category.slug });
                  }
                } else {
                  const { categoria, ...rest } = currentParams;
                  setSearchParams(rest);
                }
              }}
            />
          </motion.div>

          {/* Search Filters - Show when searching or filtering */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center"
          >
            <SearchFilters />
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <main className="px-4 pb-12">
        <div className="container max-w-6xl mx-auto space-y-12">
          {/* Hero Banner - only show when not filtering */}
          {!hasActiveFilters && <BannerCarousel position="hero" className="mt-4" />}

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <>
              {/* Featured Stores - only when not filtering */}
              {!hasActiveFilters && featuredStores.length > 0 && (
                <FeaturedStores
                  stores={featuredStores}
                  title="⭐ Lojas em Destaque"
                />
              )}

              {/* Recent Stores - only when not filtering */}
              {!hasActiveFilters && recentStores.length > 0 && (
                <FeaturedStores
                  stores={recentStores}
                  title="🆕 Lojas Recentes"
                />
              )}

              {/* Middle Banner - only when not filtering */}
              {!hasActiveFilters && <BannerCarousel position="middle" />}

              {/* All Stores / Search Results */}
              {allStores.length > 0 && (
                <FeaturedStores
                  stores={allStores}
                  title={hasActiveFilters ? `🔍 Resultados (${allStores.length})` : "🏪 Todas as Lojas"}
                  showViewAll={false}
                />
              )}

              {/* Empty State */}
              {allStores.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-12 text-center"
                >
                  <StoreIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">
                    {hasActiveFilters 
                      ? 'Nenhuma loja encontrada'
                      : `Nenhuma loja em ${selectedCity.name} ainda`
                    }
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {hasActiveFilters
                      ? 'Tente ajustar os filtros ou buscar por outro termo.'
                      : 'Seja o primeiro a cadastrar sua loja nesta cidade!'
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button 
                      onClick={() => setSearchParams({})}
                      variant="outline"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
