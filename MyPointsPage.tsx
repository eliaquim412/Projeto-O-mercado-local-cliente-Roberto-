import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Coins, Gift, History, Store, ArrowLeft, AlertCircle, Check, Ticket } from 'lucide-react';
import cuponsBannerFallback from '@/assets/banners/cupons-banner.jpg';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Navigation from '@/components/Navigation';

interface StorePoints {
  id: string;
  store_id: string;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  store?: {
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

interface Transaction {
  id: string;
  type: string;
  points: number;
  description: string | null;
  created_at: string;
  store_id: string;
  store?: {
    name: string;
  };
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  type: string;
  points_required: number;
  discount_value: number | null;
  discount_type: string | null;
  store_id: string;
  store?: {
    name: string;
  };
}

interface Profile {
  cpf: string | null;
  full_name: string;
}

export default function MyPointsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storePoints, setStorePoints] = useState<StorePoints[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redemptionDialogOpen, setRedemptionDialogOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string>(cuponsBannerFallback);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchBanner();
    }
  }, [user]);

  const fetchBanner = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('banners')
      .select('image_url')
      .eq('position', 'meus-cupons')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('display_order')
      .limit(1);

    if (data && data.length > 0) {
      setBannerUrl(data[0].image_url);
    }
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cpf, full_name')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Fetch points per store
      const { data: pointsData } = await supabase
        .from('customer_points')
        .select(`
          *,
          store:stores(name, slug, logo_url)
        `)
        .eq('customer_id', user.id)
        .order('balance', { ascending: false });

      setStorePoints(pointsData as StorePoints[] || []);

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('points_transactions')
        .select(`
          *,
          store:stores(name)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(transactionsData as Transaction[] || []);

      // Fetch available rewards from stores where user has points
      const storeIds = pointsData?.map(p => p.store_id) || [];
      if (storeIds.length > 0) {
        const { data: rewardsData } = await supabase
          .from('store_rewards')
          .select(`
            *,
            store:stores(name)
          `)
          .in('store_id', storeIds)
          .eq('is_active', true);

        setRewards(rewardsData as Reward[] || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemRequest = async () => {
    if (!selectedReward || !user) return;

    const storePoint = storePoints.find(sp => sp.store_id === selectedReward.store_id);
    if (!storePoint || storePoint.balance < selectedReward.points_required) {
      toast.error('Saldo insuficiente');
      return;
    }

    setRedeeming(true);
    try {
      const { error } = await supabase
        .from('redemption_requests')
        .insert({
          customer_id: user.id,
          store_id: selectedReward.store_id,
          reward_id: selectedReward.id,
          points_used: selectedReward.points_required,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Solicitação de resgate enviada! Vá até a loja para confirmar.');
      setRedemptionDialogOpen(false);
      setSelectedReward(null);
    } catch (error) {
      console.error('Error creating redemption request:', error);
      toast.error('Erro ao solicitar resgate');
    } finally {
      setRedeeming(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'earn': return { label: 'Compra', color: 'bg-green-500' };
      case 'redeem': return { label: 'Resgate', color: 'bg-orange-500' };
      case 'manual_add': return { label: 'Bônus', color: 'bg-blue-500' };
      case 'manual_subtract': return { label: 'Ajuste', color: 'bg-red-500' };
      default: return { label: type, color: 'bg-gray-500' };
    }
  };

  const totalBalance = storePoints.reduce((sum, sp) => sum + sp.balance, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.cpf) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">CPF não cadastrado</h2>
              <p className="text-muted-foreground mb-4">
                Para participar do programa de pontos, você precisa cadastrar seu CPF no perfil.
              </p>
              <Button onClick={() => navigate('/perfil')}>
                Atualizar Perfil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/');
          }
        }} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* Cupons Banner */}
        <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
          <img 
            src={bannerUrl} 
            alt="Super Descontos - Cupons de desconto todos os dias!" 
            className="w-full h-[120px] sm:h-[160px] lg:h-[200px] object-cover"
          />
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">Meus Cupons</h1>
          <p className="text-muted-foreground">Acompanhe seus pontos e resgate recompensas</p>
        </div>

        {/* Total Points Card */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Total</p>
                <p className="text-4xl font-bold text-primary">{totalBalance.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">pontos</p>
              </div>
              <Ticket className="h-16 w-16 text-primary/30" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="stores" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stores">Por Loja</TabsTrigger>
            <TabsTrigger value="rewards">Recompensas</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-4">
            {storePoints.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Nenhum ponto ainda</h3>
                  <p className="text-muted-foreground">Faça compras nas lojas participantes para acumular pontos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {storePoints.map((sp) => (
                  <Card key={sp.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                          {sp.store?.logo_url ? (
                            <img src={sp.store.logo_url} alt={sp.store.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{sp.store?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            +{sp.total_earned.toLocaleString()} ganhos / -{sp.total_redeemed.toLocaleString()} resgatados
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{sp.balance.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">pontos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            {rewards.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Nenhuma recompensa disponível</h3>
                  <p className="text-muted-foreground">As lojas ainda não cadastraram recompensas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rewards.map((reward) => {
                  const storePoint = storePoints.find(sp => sp.store_id === reward.store_id);
                  const canRedeem = storePoint && storePoint.balance >= reward.points_required;
                  
                  return (
                    <Card key={reward.id} className={!canRedeem ? 'opacity-60' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline">{reward.store?.name}</Badge>
                          <div className="flex items-center gap-1 text-primary font-semibold">
                            <Coins className="h-4 w-4" />
                            {reward.points_required.toLocaleString()}
                          </div>
                        </div>
                        <CardTitle className="text-lg">{reward.name}</CardTitle>
                        {reward.description && (
                          <CardDescription>{reward.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <Button 
                          className="w-full" 
                          disabled={!canRedeem}
                          onClick={() => {
                            setSelectedReward(reward);
                            setRedemptionDialogOpen(true);
                          }}
                        >
                          {canRedeem ? 'Resgatar' : 'Pontos insuficientes'}
                        </Button>
                        {storePoint && (
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            Seu saldo: {storePoint.balance.toLocaleString()} pontos
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
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
                  <div className="space-y-4">
                    {transactions.map((tx) => {
                      const typeInfo = getTransactionTypeLabel(tx.type);
                      const isPositive = tx.type === 'earn' || tx.type === 'manual_add';
                      
                      return (
                        <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className={typeInfo.color + ' text-white'}>
                              {typeInfo.label}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">{tx.store?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              {tx.description && (
                                <p className="text-xs text-muted-foreground">{tx.description}</p>
                              )}
                            </div>
                          </div>
                          <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : '-'}{tx.points.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Redemption Dialog */}
      <Dialog open={redemptionDialogOpen} onOpenChange={setRedemptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Resgate</DialogTitle>
            <DialogDescription>
              Você está solicitando o resgate de uma recompensa
            </DialogDescription>
          </DialogHeader>

          {selectedReward && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-semibold">{selectedReward.name}</p>
                <p className="text-sm text-muted-foreground">{selectedReward.store?.name}</p>
                <p className="text-lg font-bold text-primary mt-2">
                  {selectedReward.points_required.toLocaleString()} pontos
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Importante:</strong> O resgate só será confirmado quando você estiver presente na loja. 
                  Após solicitar, vá até o estabelecimento para finalizar.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRedemptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRedeemRequest} disabled={redeeming}>
              {redeeming ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Solicitar Resgate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
