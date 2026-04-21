import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Check, X, Eye, MoreVertical, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductData {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  status: string;
  is_featured: boolean;
  images: string[] | null;
  store: { name: string; slug: string } | null;
  category: { name: string } | null;
}

export default function AdminProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select(`
        *,
        store:stores(name, slug),
        category:categories(name)
      `)
      .order('created_at', { ascending: false });

    setProducts((data as unknown as ProductData[]) || []);
    setLoading(false);
  };

  const updateStatus = async (productId: string, newStatus: string) => {
    const { error } = await supabase
      .from('products')
      .update({ status: newStatus })
      .eq('id', productId);

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado' });
      fetchProducts();
    }
  };

  const toggleFeatured = async (productId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_featured: !currentStatus })
      .eq('id', productId);

    if (error) {
      toast({ title: 'Erro ao atualizar destaque', variant: 'destructive' });
    } else {
      toast({ title: currentStatus ? 'Destaque removido' : 'Produto destacado' });
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.store?.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' 
      || product.status === filter
      || (filter === 'featured' && product.is_featured);
    return matchesSearch && matchesFilter;
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500',
    inactive: 'bg-gray-500/10 text-gray-500',
    pending: 'bg-yellow-500/10 text-yellow-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produtos</h1>
        <p className="text-muted-foreground">Gerencie os produtos do marketplace.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto ou loja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="featured">Destaques</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                    {product.images && product.images.length > 0 && product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{product.name}</p>
                      <Badge className={statusColors[product.status]}>
                        {product.status === 'active' ? 'Ativo' : product.status === 'pending' ? 'Pendente' : 'Inativo'}
                      </Badge>
                      {product.is_featured && (
                        <Badge className="bg-primary">
                          <Star className="w-3 h-3 mr-1" />
                          Destaque
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>R$ {product.price.toFixed(2).replace('.', ',')}</span>
                      <span>Estoque: {product.stock}</span>
                      {product.category && <span>{product.category.name}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Loja: {product.store?.name || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleFeatured(product.id, product.is_featured)}>
                      <Star className="w-4 h-4 mr-2" />
                      {product.is_featured ? 'Remover destaque' : 'Destacar'}
                    </DropdownMenuItem>
                    {product.status !== 'active' && (
                      <DropdownMenuItem onClick={() => updateStatus(product.id, 'active')}>
                        <Check className="w-4 h-4 mr-2" />
                        Aprovar
                      </DropdownMenuItem>
                    )}
                    {product.status === 'active' && (
                      <DropdownMenuItem onClick={() => updateStatus(product.id, 'inactive')}>
                        <X className="w-4 h-4 mr-2" />
                        Desativar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
