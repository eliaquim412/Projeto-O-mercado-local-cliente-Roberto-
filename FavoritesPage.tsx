import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FavoriteButton from '@/components/store/FavoriteButton';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritesContext } from '@/hooks/FavoritesContext';
import { supabase } from '@/integrations/supabase/client';

interface FavoriteProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  images: string[];
  stock: number;
  store: {
    name: string;
    slug: string;
  };
  category: { name: string } | null;
}

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavoritesContext();
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [favorites]);

  const fetchProducts = async () => {
    const productIds = favorites.map(f => f.product_id);
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, price, original_price, images, stock,
        store:stores(name, slug),
        category:categories(name)
      `)
      .in('id', productIds);

    if (!error && data) {
      // Sort by favorites order
      const sortedProducts = productIds
        .map(id => data.find(p => p.id === id))
        .filter(Boolean) as FavoriteProduct[];
      setProducts(sortedProducts);
    }
    setLoading(false);
  };

  if (authLoading || favoritesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container max-w-6xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/10">
              <Heart className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Meus Favoritos</h1>
              <p className="text-muted-foreground">
                {products.length} {products.length === 1 ? 'produto salvo' : 'produtos salvos'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 glass rounded-2xl"
          >
            <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum favorito ainda</h2>
            <p className="text-muted-foreground mb-6">
              Explore as lojas e adicione produtos aos seus favoritos!
            </p>
            <Button onClick={() => navigate('/')}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Explorar Produtos
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => {
              const discount = product.original_price 
                ? Math.round((1 - product.price / product.original_price) * 100) 
                : 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass overflow-hidden group h-full">
                    <div className="relative aspect-square bg-muted">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          Sem foto
                        </div>
                      )}
                      
                      {/* Favorite Button */}
                      <div className="absolute top-2 right-2">
                        <FavoriteButton productId={product.id} />
                      </div>
                      
                      {discount > 0 && (
                        <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
                          -{discount}%
                        </Badge>
                      )}
                      
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <span className="text-muted-foreground font-medium">Esgotado</span>
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="p-4">
                      <Link 
                        to={`/loja/${product.store?.slug}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {product.store?.name}
                      </Link>
                      
                      {product.category && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {product.category.name}
                        </Badge>
                      )}
                      
                      <h3 className="font-semibold line-clamp-2 min-h-[2.5rem] mt-1">
                        {product.name}
                      </h3>
                      
                      <div className="mt-2">
                        <p className="text-lg font-bold text-primary">
                          R$ {product.price.toFixed(2).replace('.', ',')}
                        </p>
                        {product.original_price && (
                          <p className="text-sm text-muted-foreground line-through">
                            R$ {product.original_price.toFixed(2).replace('.', ',')}
                          </p>
                        )}
                      </div>
                      
                      <Button 
                        asChild
                        variant="outline"
                        className="w-full mt-3"
                        size="sm"
                      >
                        <Link to={`/loja/${product.store?.slug}`}>
                          Ver na Loja
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}