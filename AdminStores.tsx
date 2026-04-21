import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Store, Search, MapPin, Star, Check, X, Eye, MoreVertical } from 'lucide-react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  rating_average: number;
  followers_count: number;
  created_at: string;
  city: { name: string; state: string } | null;
  owner: { full_name: string } | null;
}

export default function AdminStores() {
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);

    const storesRes = await supabase
      .from('stores')
      .select(`
        *,
        city:cities(name, state)
      `)
      .order('created_at', { ascending: false });

    if (storesRes.error) {
      console.error('AdminStores fetch error:', storesRes.error);
      toast({
        title: 'Erro ao carregar lojas',
        description: storesRes.error.message,
        variant: 'destructive',
      });
      setStores([]);
      setLoading(false);
      return;
    }

    const storesRaw = (storesRes.data as any[]) || [];
    const ownerIds = Array.from(
      new Set(storesRaw.map((s) => s.owner_id).filter(Boolean))
    ) as string[];

    let ownersById = new Map<string, { full_name: string }>();
    if (ownerIds.length) {
      const ownersRes = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds);

      if (ownersRes.error) {
        console.error('AdminStores owners fetch error:', ownersRes.error);
      } else {
        ownersById = new Map(
          (ownersRes.data || []).map((o) => [o.id, { full_name: o.full_name }])
        );
      }
    }

    const merged = storesRaw.map((s) => ({
      ...s,
      owner: ownersById.get(s.owner_id) || null,
    }));

    setStores(merged as StoreData[]);
    setLoading(false);
  };

  const toggleActive = async (storeId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('stores')
      .update({ is_active: !currentStatus })
      .eq('id', storeId);

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      toast({ title: currentStatus ? 'Loja desativada' : 'Loja ativada' });
      fetchStores();
    }
  };

  const toggleVerified = async (storeId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('stores')
      .update({ is_verified: !currentStatus })
      .eq('id', storeId);

    if (error) {
      toast({ title: 'Erro ao atualizar verificação', variant: 'destructive' });
    } else {
      toast({ title: currentStatus ? 'Verificação removida' : 'Loja verificada' });
      fetchStores();
    }
  };

  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' 
      || (filter === 'active' && store.is_active)
      || (filter === 'inactive' && !store.is_active)
      || (filter === 'verified' && store.is_verified);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lojas</h1>
        <p className="text-muted-foreground">Gerencie as lojas do marketplace.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
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
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
            <SelectItem value="verified">Verificadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-12">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma loja encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStores.map((store, index) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{store.name}</p>
                      <Badge variant={store.is_active ? 'default' : 'secondary'}>
                        {store.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                      {store.is_verified && (
                        <Badge className="bg-blue-500">Verificada</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {store.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {store.city.name}, {store.city.state}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {Number(store.rating_average).toFixed(1)}
                      </span>
                      <span>{store.followers_count} seguidores</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dono: {store.owner?.full_name || 'N/A'} • 
                      Criada em {format(new Date(store.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
                    <DropdownMenuItem asChild>
                      <Link to={`/loja/${store.slug}`} target="_blank">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver loja
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleActive(store.id, store.is_active)}>
                      {store.is_active ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleVerified(store.id, store.is_verified)}>
                      {store.is_verified ? 'Remover verificação' : 'Verificar loja'}
                    </DropdownMenuItem>
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
