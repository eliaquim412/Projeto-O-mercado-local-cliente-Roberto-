import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Phone, Calendar, MoreVertical, Shield, ShieldOff, Eye, Ban, Trash2, Store, MapPin, FileText, Loader2, UserX, UserCheck, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input as FormInput } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  cpf: string | null;
  user_type: string;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  business_name: string | null;
  document: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  is_suspended: boolean;
  suspended_at: string | null;
  roles: { role: string }[];
  stores?: { id: string; name: string; slug: string }[];
  orders_count?: number;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMunicipalDialog, setShowMunicipalDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cities, setCities] = useState<{ id: string; name: string; state: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [municipalName, setMunicipalName] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchCities();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);

    const [profilesRes, rolesRes, storesRes, ordersRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('stores').select('id, name, slug, owner_id'),
      supabase.from('orders').select('id, customer_id'),
    ]);

    if (profilesRes.error) {
      console.error('AdminUsers fetch error:', profilesRes.error);
      toast({
        title: 'Erro ao carregar usuários',
        description: profilesRes.error?.message || 'Tente novamente.',
        variant: 'destructive',
      });
      setUsers([]);
      setLoading(false);
      return;
    }

    const rolesByUserId = new Map<string, { role: string }[]>();
    (rolesRes.data || []).forEach((r) => {
      const list = rolesByUserId.get(r.user_id) || [];
      list.push({ role: r.role });
      rolesByUserId.set(r.user_id, list);
    });

    const storesByOwnerId = new Map<string, { id: string; name: string; slug: string }[]>();
    (storesRes.data || []).forEach((s) => {
      const list = storesByOwnerId.get(s.owner_id) || [];
      list.push({ id: s.id, name: s.name, slug: s.slug });
      storesByOwnerId.set(s.owner_id, list);
    });

    const ordersCountByUserId = new Map<string, number>();
    (ordersRes.data || []).forEach((o) => {
      if (o.customer_id) {
        ordersCountByUserId.set(o.customer_id, (ordersCountByUserId.get(o.customer_id) || 0) + 1);
      }
    });

    const merged = ((profilesRes.data as any[]) || []).map((p) => ({
      ...p,
      roles: rolesByUserId.get(p.id) || [],
      stores: storesByOwnerId.get(p.id) || [],
      orders_count: ordersCountByUserId.get(p.id) || 0,
    }));

    setUsers(merged as UserProfile[]);
    setLoading(false);
  };

  const fetchCities = async () => {
    const { data } = await supabase.from('cities').select('id, name, state').eq('is_active', true).order('name');
    setCities(data || []);
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) {
        toast({ title: 'Erro ao remover admin', variant: 'destructive' });
      } else {
        toast({ title: 'Permissão de admin removida' });
        fetchUsers();
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        toast({ title: 'Erro ao adicionar admin', variant: 'destructive' });
      } else {
        toast({ title: 'Usuário promovido a admin' });
        fetchUsers();
      }
    }
  };

  const openMunicipalDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedCityId('');
    setMunicipalName(user.full_name || '');
    setShowMunicipalDialog(true);
  };

  const handleToggleMunicipalAdmin = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    const isMunicipalAdmin = selectedUser.roles?.some(r => r.role === 'municipal_admin');

    if (isMunicipalAdmin) {
      await supabase.from('user_roles').delete().eq('user_id', selectedUser.id).eq('role', 'municipal_admin');
      await supabase.from('municipal_profiles' as any).delete().eq('user_id', selectedUser.id);
      await supabase.from('profiles').update({ user_type: 'consumer' }).eq('id', selectedUser.id);
      toast({ title: 'Permissão municipal removida' });
    } else {
      if (!selectedCityId || !municipalName) {
        toast({ title: 'Selecione uma cidade e informe o nome', variant: 'destructive' });
        setActionLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from('municipal_profiles' as any)
        .select('id')
        .eq('city_id', selectedCityId)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Esta cidade já possui um admin municipal', variant: 'destructive' });
        setActionLoading(false);
        return;
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: selectedUser.id, role: 'municipal_admin' });

      if (roleError) {
        toast({ title: 'Erro ao adicionar role', description: roleError.message, variant: 'destructive' });
        setActionLoading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from('municipal_profiles' as any)
        .insert({
          user_id: selectedUser.id,
          city_id: selectedCityId,
          name: municipalName,
          is_active: true,
        });

      if (profileError) {
        toast({ title: 'Erro ao criar perfil municipal', description: profileError.message, variant: 'destructive' });
        await supabase.from('user_roles').delete().eq('user_id', selectedUser.id).eq('role', 'municipal_admin');
        setActionLoading(false);
        return;
      }

      await supabase.from('profiles').update({ user_type: 'municipal_admin' }).eq('id', selectedUser.id);
      toast({ title: 'Usuário promovido a Admin Municipal!' });
    }

    setActionLoading(false);
    setShowMunicipalDialog(false);
    fetchUsers();
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    const newSuspendedState = !selectedUser.is_suspended;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: newSuspendedState,
        suspended_at: newSuspendedState ? new Date().toISOString() : null,
      })
      .eq('id', selectedUser.id);

    if (error) {
      toast({
        title: newSuspendedState ? 'Erro ao suspender usuário' : 'Erro ao reativar usuário',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: newSuspendedState ? 'Usuário suspenso' : 'Usuário reativado',
        description: newSuspendedState 
          ? `${selectedUser.full_name} foi suspenso com sucesso.`
          : `${selectedUser.full_name} foi reativado com sucesso.`,
      });
      fetchUsers();
    }

    setActionLoading(false);
    setShowSuspendDialog(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);

    // First delete user's stores and related data
    if (selectedUser.stores && selectedUser.stores.length > 0) {
      for (const store of selectedUser.stores) {
        // Delete products from the store
        await supabase.from('products').delete().eq('store_id', store.id);
        // Delete coupons
        await supabase.from('coupons').delete().eq('store_id', store.id);
        // Delete store banners
        await supabase.from('store_banners').delete().eq('store_id', store.id);
        // Delete store rewards
        await supabase.from('store_rewards').delete().eq('store_id', store.id);
        // Delete the store
        await supabase.from('stores').delete().eq('id', store.id);
      }
    }

    // Delete user's favorites
    await supabase.from('favorites').delete().eq('user_id', selectedUser.id);
    
    // Delete user's store followers
    await supabase.from('store_followers').delete().eq('user_id', selectedUser.id);
    
    // Delete user's reviews
    await supabase.from('product_reviews').delete().eq('user_id', selectedUser.id);
    await supabase.from('store_reviews').delete().eq('user_id', selectedUser.id);
    
    // Delete user roles
    await supabase.from('user_roles').delete().eq('user_id', selectedUser.id);
    
    // Delete profile (this should cascade to auth.users due to foreign key)
    const { error } = await supabase.from('profiles').delete().eq('id', selectedUser.id);

    if (error) {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Usuário excluído',
        description: `${selectedUser.full_name} foi excluído com sucesso.`,
      });
      fetchUsers();
    }

    setActionLoading(false);
    setShowDeleteDialog(false);
    setSelectedUser(null);
  };

  const openUserDetail = (user: UserProfile) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const openSuspendDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setShowSuspendDialog(true);
  };

  const openDeleteDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.phone?.includes(search) ||
    user.cpf?.includes(search)
  );

  const formatAddress = (user: UserProfile) => {
    const parts = [
      user.address_street,
      user.address_number,
      user.address_complement,
      user.address_neighborhood,
      user.address_city,
      user.address_state,
      user.address_zipcode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Não informado';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do marketplace.</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {users.length} usuários
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Carregando...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user, index) => {
            const isAdmin = user.roles?.some(r => r.role === 'admin');
            const isMunicipalAdmin = user.roles?.some(r => r.role === 'municipal_admin');
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`glass rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-colors ${user.is_suspended ? 'opacity-60 border-destructive/50' : ''}`}
                onClick={() => openUserDetail(user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${user.is_suspended ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className={`w-5 h-5 ${user.is_suspended ? 'text-destructive' : 'text-primary'}`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                        <Badge variant={user.user_type === 'merchant' ? 'default' : user.user_type === 'municipal_admin' ? 'outline' : 'secondary'}>
                          {user.user_type === 'merchant' ? 'Lojista' : user.user_type === 'municipal_admin' ? 'Prefeitura' : 'Consumidor'}
                        </Badge>
                        {isAdmin && (
                          <Badge className="bg-primary">Admin</Badge>
                        )}
                        {isMunicipalAdmin && (
                          <Badge className="bg-green-600 text-white">
                            <Landmark className="w-3 h-3 mr-1" />Prefeitura
                          </Badge>
                        )}
                        {user.is_suspended && (
                          <Badge variant="destructive">Suspenso</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(user.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                        {user.stores && user.stores.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            {user.stores.length} loja(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openUserDetail(user); }}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleAdmin(user.id, isAdmin); }}>
                        {isAdmin ? (
                          <>
                            <ShieldOff className="w-4 h-4 mr-2" />
                            Remover Admin
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Tornar Admin
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openMunicipalDialog(user); }}>
                        {isMunicipalAdmin ? (
                          <>
                            <Landmark className="w-4 h-4 mr-2" />
                            Remover Admin Municipal
                          </>
                        ) : (
                          <>
                            <Landmark className="w-4 h-4 mr-2" />
                            Tornar Admin Municipal
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openSuspendDialog(user); }}>
                        {user.is_suspended ? (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Reativar usuário
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            Suspender usuário
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); openDeleteDialog(user); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir usuário
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* User Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${selectedUser?.is_suspended ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                {selectedUser?.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-full h-full object-cover" />
                ) : (
                  <Users className={`w-6 h-6 ${selectedUser?.is_suspended ? 'text-destructive' : 'text-primary'}`} />
                )}
              </div>
              <div>
                <span>{selectedUser?.full_name || 'Sem nome'}</span>
                <div className="flex gap-2 mt-1">
                  <Badge variant={selectedUser?.user_type === 'merchant' ? 'default' : 'secondary'}>
                    {selectedUser?.user_type === 'merchant' ? 'Lojista' : 'Consumidor'}
                  </Badge>
                  {selectedUser?.roles?.some(r => r.role === 'admin') && (
                    <Badge className="bg-primary">Admin</Badge>
                  )}
                  {selectedUser?.is_suspended && (
                    <Badge variant="destructive">Suspenso</Badge>
                  )}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Informações completas do usuário
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 mt-4">
              {/* Basic Info */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Informações Pessoais
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Nome completo</p>
                    <p className="font-medium">{selectedUser.full_name || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedUser.phone || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CPF</p>
                    <p className="font-medium">{selectedUser.cpf || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Documento (CNPJ)</p>
                    <p className="font-medium">{selectedUser.document || 'Não informado'}</p>
                  </div>
                  {selectedUser.business_name && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Nome da empresa</p>
                      <p className="font-medium">{selectedUser.business_name}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço
                </h4>
                <p className="text-sm">{formatAddress(selectedUser)}</p>
              </div>

              <Separator />

              {/* Dates */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Datas
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {format(new Date(selectedUser.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última atualização</p>
                    <p className="font-medium">
                      {format(new Date(selectedUser.updated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedUser.is_suspended && selectedUser.suspended_at && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Suspenso em</p>
                      <p className="font-medium text-destructive">
                        {format(new Date(selectedUser.suspended_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Estatísticas
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Pedidos realizados</p>
                    <p className="font-medium">{selectedUser.orders_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lojas</p>
                    <p className="font-medium">{selectedUser.stores?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Stores */}
              {selectedUser.stores && selectedUser.stores.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      Lojas do usuário
                    </h4>
                    <div className="space-y-2">
                      {selectedUser.stores.map(store => (
                        <div key={store.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="font-medium">{store.name}</span>
                          <Badge variant="outline">{store.slug}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Fechar
            </Button>
            {selectedUser && (
              <>
                <Button
                  variant={selectedUser.is_suspended ? 'default' : 'secondary'}
                  onClick={() => { setShowDetailModal(false); openSuspendDialog(selectedUser); }}
                >
                  {selectedUser.is_suspended ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Reativar
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Suspender
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { setShowDetailModal(false); openDeleteDialog(selectedUser); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_suspended ? 'Reativar usuário?' : 'Suspender usuário?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_suspended ? (
                <>
                  Tem certeza que deseja reativar <strong>{selectedUser?.full_name}</strong>?
                  O usuário poderá acessar a plataforma normalmente.
                </>
              ) : (
                <>
                  Tem certeza que deseja suspender <strong>{selectedUser?.full_name}</strong>?
                  O usuário não poderá acessar a plataforma enquanto estiver suspenso.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendUser}
              disabled={actionLoading}
              className={selectedUser?.is_suspended ? '' : 'bg-destructive hover:bg-destructive/90'}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedUser?.is_suspended ? 'Reativar' : 'Suspender'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir usuário permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja excluir <strong>{selectedUser?.full_name}</strong>?
              </p>
              <p className="text-destructive font-medium">
                Esta ação é irreversível e irá excluir:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Perfil do usuário</li>
                <li>Todas as lojas do usuário ({selectedUser?.stores?.length || 0})</li>
                <li>Todos os produtos das lojas</li>
                <li>Cupons, avaliações e favoritos</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Municipal Admin Dialog */}
      <Dialog open={showMunicipalDialog} onOpenChange={setShowMunicipalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              {selectedUser?.roles?.some(r => r.role === 'municipal_admin')
                ? 'Remover Admin Municipal'
                : 'Tornar Admin Municipal'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.roles?.some(r => r.role === 'municipal_admin')
                ? `Remover permissão municipal de ${selectedUser?.full_name}? O perfil municipal será excluído.`
                : `Vincule ${selectedUser?.full_name} a uma cidade como admin municipal.`}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && !selectedUser.roles?.some(r => r.role === 'municipal_admin') && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Nome da Prefeitura</Label>
                <FormInput
                  value={municipalName}
                  onChange={e => setMunicipalName(e.target.value)}
                  placeholder="Ex: Prefeitura de Mata Verde"
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Select value={selectedCityId} onValueChange={setSelectedCityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {cities.map(city => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}, {city.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowMunicipalDialog(false)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button onClick={handleToggleMunicipalAdmin} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedUser?.roles?.some(r => r.role === 'municipal_admin') ? 'Remover' : 'Conceder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
