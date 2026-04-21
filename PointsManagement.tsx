import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Coins, Search, Plus, Minus, History, Gift, Users, AlertCircle, Check, X, Power } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StoreData {
  id: string;
  name: string;
  points_program_enabled: boolean;
}

interface CustomerPoints {
  id: string;
  customer_id: string;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  created_at: string;
  profile?: {
    full_name: string;
    cpf: string | null;
    phone: string | null;
  };
}

interface PointsTransaction {
  id: string;
  type: string;
  points: number;
  description: string | null;
  created_at: string;
  customer_id: string;
  profile?: {
    full_name: string;
  };
}

interface RedemptionRequest {
  id: string;
  customer_id: string;
  points_used: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  profile?: {
    full_name: string;
    cpf: string | null;
  };
  reward?: {
    name: string;
  };
}

export default function PointsManagement() {
  const context = useOutletContext<{ store: StoreData; refreshStore: () => Promise<void> }>();
  const store = context?.store;
  const refreshStore = context?.refreshStore;
  
  const [customers, setCustomers] = useState<CustomerPoints[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCpf, setSearchCpf] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [togglingProgram, setTogglingProgram] = useState(false);
  
  // Points Dialog State
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPoints | null>(null);
  const [pointsAction, setPointsAction] = useState<'add' | 'subtract'>('add');
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsDescription, setPointsDescription] = useState('');
  const [processingPoints, setProcessingPoints] = useState(false);

  const togglePointsProgram = async () => {
    if (!store?.id) return;
    
    setTogglingProgram(true);
    try {
      const newValue = !store.points_program_enabled;
      const { error } = await supabase
        .from('stores')
        .update({ points_program_enabled: newValue })
        .eq('id', store.id);

      if (error) throw error;

      toast.success(newValue ? 'Programa de pontos ativado!' : 'Programa de pontos desativado');
      await refreshStore?.();
    } catch (error) {
      console.error('Error toggling points program:', error);
      toast.error('Erro ao alterar configuração');
    } finally {
      setTogglingProgram(false);
    }
  };

  useEffect(() => {
    if (store?.id) {
      fetchData();
    }
  }, [store?.id]);

  const fetchData = async () => {
    if (!store?.id) return;

    try {
      // Fetch customers with points
      const { data: customersData } = await supabase
        .from('customer_points')
        .select(`
          *,
          profile:profiles!customer_points_customer_id_fkey(full_name, cpf, phone)
        `)
        .eq('store_id', store.id)
        .order('balance', { ascending: false });

      setCustomers(customersData as CustomerPoints[] || []);

      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from('points_transactions')
        .select(`
          *,
          profile:profiles!points_transactions_customer_id_fkey(full_name)
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(transactionsData as PointsTransaction[] || []);

      // Fetch pending redemption requests
      const { data: requestsData } = await supabase
        .from('redemption_requests')
        .select(`
          *,
          profile:profiles!redemption_requests_customer_id_fkey(full_name, cpf),
          reward:store_rewards!redemption_requests_reward_id_fkey(name)
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      setRequests(requestsData as RedemptionRequest[] || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchCustomerByCpf = async () => {
    if (!searchCpf.trim()) {
      toast.error('Digite um CPF para buscar');
      return;
    }

    const cleanCpf = searchCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast.error('CPF inválido');
      return;
    }

    setSearchingCustomer(true);
    try {
      // Use security definer function to search by CPF
      const { data, error } = await supabase
        .rpc('search_customer_by_cpf', {
          p_cpf: cleanCpf,
          p_store_id: store!.id
        });

      if (error) throw error;

      if (data && data.length > 0) {
        setFoundCustomer(data[0]);
        
        // Check if already in program
        const existingCustomer = customers.find(c => c.customer_id === data[0].id);
        if (existingCustomer) {
          toast.info('Cliente já está no programa de pontos');
        }
      } else {
        setFoundCustomer(null);
        toast.error('Cliente não encontrado. Verifique se o CPF está cadastrado.');
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      toast.error('Erro ao buscar cliente');
    } finally {
      setSearchingCustomer(false);
    }
  };

  const addCustomerToProgram = async () => {
    if (!foundCustomer || !store?.id) return;

    try {
      // Create a customer_points record with 0 balance
      const { error } = await supabase
        .from('customer_points')
        .insert({
          customer_id: foundCustomer.id,
          store_id: store.id,
          balance: 0,
          total_earned: 0,
          total_redeemed: 0
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Cliente já está no programa');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Cliente adicionado ao programa!');
      setFoundCustomer(null);
      setSearchCpf('');
      fetchData();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Erro ao adicionar cliente');
    }
  };

  const handlePointsSubmit = async () => {
    if (!selectedCustomer || !pointsAmount || !store?.id) return;

    const points = parseInt(pointsAmount);
    if (isNaN(points) || points <= 0) {
      toast.error('Digite uma quantidade válida de pontos');
      return;
    }

    if (pointsAction === 'subtract' && points > selectedCustomer.balance) {
      toast.error('Saldo insuficiente');
      return;
    }

    setProcessingPoints(true);
    try {
      const transactionType = pointsAction === 'add' ? 'manual_add' : 'manual_subtract';
      
      const { error } = await supabase
        .from('points_transactions')
        .insert({
          customer_id: selectedCustomer.customer_id,
          store_id: store.id,
          type: transactionType,
          points: points,
          description: pointsDescription || (pointsAction === 'add' ? 'Pontos adicionados manualmente' : 'Pontos subtraídos manualmente'),
          performed_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success(`${points} pontos ${pointsAction === 'add' ? 'adicionados' : 'subtraídos'} com sucesso!`);
      setPointsDialogOpen(false);
      setSelectedCustomer(null);
      setPointsAmount('');
      setPointsDescription('');
      fetchData();
    } catch (error) {
      console.error('Error processing points:', error);
      toast.error('Erro ao processar pontos');
    } finally {
      setProcessingPoints(false);
    }
  };

  const handleRedemptionAction = async (requestId: string, action: 'confirm' | 'cancel') => {
    try {
      const { error } = await supabase
        .from('redemption_requests')
        .update({
          status: action === 'confirm' ? 'confirmed' : 'cancelled',
          confirmed_at: action === 'confirm' ? new Date().toISOString() : null,
          confirmed_by: action === 'confirm' ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', requestId);

      if (error) throw error;

      // If confirmed, add transaction record for redemption
      if (action === 'confirm') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          await supabase
            .from('points_transactions')
            .insert({
              customer_id: request.customer_id,
              store_id: store!.id,
              type: 'redeem',
              points: request.points_used,
              reward_id: request.reward?.name ? undefined : undefined,
              description: `Resgate: ${request.reward?.name}`,
              performed_by: (await supabase.auth.getUser()).data.user?.id
            });
        }
      }

      toast.success(action === 'confirm' ? 'Resgate confirmado!' : 'Solicitação cancelada');
      fetchData();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Erro ao processar solicitação');
    }
  };

  const formatCpf = (cpf: string | null) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'earn': return { label: 'Compra', color: 'bg-green-500' };
      case 'redeem': return { label: 'Resgate', color: 'bg-orange-500' };
      case 'manual_add': return { label: 'Adição Manual', color: 'bg-blue-500' };
      case 'manual_subtract': return { label: 'Subtração Manual', color: 'bg-red-500' };
      default: return { label: type, color: 'bg-gray-500' };
    }
  };

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Loja não encontrada</h2>
        <p className="text-muted-foreground">Você precisa criar uma loja primeiro.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Pontos</h1>
          <p className="text-muted-foreground">Gerencie os pontos e clientes do seu programa de fidelidade</p>
        </div>
        
        {/* Toggle Program */}
        <Card className={`${store.points_program_enabled ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${store.points_program_enabled ? 'bg-green-500/20' : 'bg-destructive/20'}`}>
                <Power className={`w-5 h-5 ${store.points_program_enabled ? 'text-green-500' : 'text-destructive'}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Programa de Pontos</p>
                <p className="text-xs text-muted-foreground">
                  {store.points_program_enabled ? 'Clientes acumulam pontos em compras' : 'Desativado - clientes não ganham pontos'}
                </p>
              </div>
              <Switch
                checked={store.points_program_enabled}
                onCheckedChange={togglePointsProgram}
                disabled={togglingProgram}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {!store.points_program_enabled && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <p className="text-sm">
                O programa de pontos está <strong>desativado</strong>. Seus clientes não acumularão pontos nas compras. 
                Ative o programa acima para começar a fidelizar seus clientes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-sm text-muted-foreground">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Coins className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + c.total_earned, 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pontos Emitidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Gift className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + c.total_redeemed, 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pontos Resgatados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">Resgates Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="transactions">Histórico</TabsTrigger>
          <TabsTrigger value="redemptions" className="relative">
            Resgates
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 h-5 min-w-[20px] px-1">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Buscar/Cadastrar Cliente</CardTitle>
              <CardDescription>Busque um cliente pelo CPF para adicionar ao programa ou gerenciar pontos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o CPF (apenas números)"
                  value={searchCpf}
                  onChange={(e) => setSearchCpf(e.target.value.replace(/\D/g, '').substring(0, 11))}
                  maxLength={14}
                />
                <Button onClick={searchCustomerByCpf} disabled={searchingCustomer}>
                  {searchingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {foundCustomer && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{foundCustomer.full_name}</p>
                      <p className="text-sm text-muted-foreground">CPF: {formatCpf(foundCustomer.cpf)}</p>
                      {foundCustomer.phone && <p className="text-sm text-muted-foreground">Tel: {foundCustomer.phone}</p>}
                    </div>
                    {!customers.find(c => c.customer_id === foundCustomer.id) && (
                      <Button onClick={addCustomerToProgram}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar ao Programa
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clientes no Programa</CardTitle>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum cliente no programa ainda
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Ganhos</TableHead>
                      <TableHead className="text-right">Resgatados</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.profile?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{formatCpf(customer.profile?.cpf || null)}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-primary">{customer.balance.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          +{customer.total_earned.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          -{customer.total_redeemed.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setPointsAction('add');
                                setPointsDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setPointsAction('subtract');
                                setPointsDialogOpen(true);
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de Transações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma transação registrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Pontos</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const typeInfo = getTransactionTypeLabel(tx.type);
                      const isPositive = tx.type === 'earn' || tx.type === 'manual_add';
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{tx.profile?.full_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={typeInfo.color + ' text-white'}>
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : '-'}{tx.points.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{tx.description || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redemptions Tab */}
        <TabsContent value="redemptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Solicitações de Resgate
              </CardTitle>
              <CardDescription>
                Confirme os resgates apenas com o cliente presente na loja
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma solicitação de resgate
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Recompensa</TableHead>
                      <TableHead className="text-right">Pontos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{request.profile?.full_name || 'N/A'}</TableCell>
                        <TableCell>{formatCpf(request.profile?.cpf || null)}</TableCell>
                        <TableCell>{request.reward?.name || 'N/A'}</TableCell>
                        <TableCell className="text-right font-medium">{request.points_used.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'pending' ? 'secondary' :
                            request.status === 'confirmed' ? 'default' : 'destructive'
                          }>
                            {request.status === 'pending' ? 'Pendente' :
                             request.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleRedemptionAction(request.id, 'confirm')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRedemptionAction(request.id, 'cancel')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Points Dialog */}
      <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pointsAction === 'add' ? 'Adicionar' : 'Subtrair'} Pontos
            </DialogTitle>
            <DialogDescription>
              Cliente: {selectedCustomer?.profile?.full_name}
              <br />
              Saldo atual: {selectedCustomer?.balance.toLocaleString()} pontos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantidade de Pontos</Label>
              <Input
                type="number"
                min="1"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                placeholder="Ex: 100"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={pointsDescription}
                onChange={(e) => setPointsDescription(e.target.value)}
                placeholder="Motivo da operação..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePointsSubmit} 
              disabled={processingPoints || !pointsAmount}
              variant={pointsAction === 'subtract' ? 'destructive' : 'default'}
            >
              {processingPoints && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {pointsAction === 'add' ? 'Adicionar' : 'Subtrair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
