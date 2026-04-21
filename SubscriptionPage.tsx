import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Gem, Shield, Star, Loader2, Settings } from 'lucide-react';
import { useSubscription, PLANS, PlanKey } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

const planDetails = [
  {
    key: 'prata' as PlanKey,
    name: 'Prata',
    price: 'R$ 29,90',
    icon: Shield,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    features: [
      'Publicar produtos',
      'Gerenciar pedidos',
      'Banner da loja',
      'Chat com clientes',
    ],
    notIncluded: [
      'Cupons de desconto',
      'Sistema de fidelidade',
      'Sistemas extras',
    ],
  },
  {
    key: 'ouro' as PlanKey,
    name: 'Ouro',
    price: 'R$ 49,90',
    icon: Crown,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    popular: true,
    features: [
      'Tudo do Plano Prata',
      'Cupons de desconto',
      'Sistema de fidelidade',
      'Recompensas para clientes',
    ],
    notIncluded: [
      'Sistemas extras',
    ],
  },
  {
    key: 'diamante' as PlanKey,
    name: 'Diamante',
    price: 'R$ 69,90',
    icon: Gem,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    features: [
      'Tudo do Plano Ouro',
      'Acesso a sistemas extras',
      'Solicitação de acesso a ferramentas',
      'Suporte prioritário',
    ],
    notIncluded: [],
  },
];

export default function SubscriptionPage() {
  const { plan, subscribed, subscriptionEnd, isGuest, isGrandfathered, needsPlanSelection, loading: subLoading } = useSubscription();
  const { session } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleSubscribe = async (priceId: string, planKey: string) => {
    if (!session) {
      toast.error('Você precisa estar logado para assinar');
      return;
    }

    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error('Erro ao iniciar checkout: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error('Erro ao abrir portal: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoadingPortal(false);
    }
  };

  if (subLoading) {
    return <div className="animate-pulse text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-muted-foreground">Escolha o plano ideal para sua loja</p>
      </div>

      {/* No plan warning */}
      {needsPlanSelection && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium">Escolha um plano para continuar</p>
              <p className="text-sm text-muted-foreground">Selecione um plano abaixo para acessar todas as funcionalidades da sua loja.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grandfathered banner */}
      {isGrandfathered && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-center gap-3">
            <Star className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Acesso completo — Usuário fundador</p>
              <p className="text-sm text-muted-foreground">Você tem acesso total à plataforma sem necessidade de assinatura.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current plan info */}
      {subscribed && !isGrandfathered && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">
                  Plano atual: <span className="text-primary capitalize">{isGuest ? 'Convidado' : plan}</span>
                </p>
                {subscriptionEnd && (
                  <p className="text-sm text-muted-foreground">
                    Próxima renovação: {new Date(subscriptionEnd).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {isGuest && (
                  <p className="text-sm text-muted-foreground">Acesso liberado pelo administrador</p>
                )}
              </div>
            </div>
            {!isGuest && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
                Gerenciar Assinatura
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {planDetails.map((p) => {
          const isCurrent = plan === p.key;
          const Icon = p.icon;

          return (
            <Card
              key={p.key}
              className={`relative overflow-hidden transition-all ${
                isCurrent ? `border-2 ${p.borderColor} shadow-lg` : ''
              } ${p.popular && !isCurrent ? 'border-yellow-500/20' : ''}`}
            >
              {p.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-yellow-500 text-black">
                    Popular
                  </Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-0 left-0">
                  <Badge className="rounded-none rounded-br-lg bg-primary">Seu Plano</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2 pt-8">
                <div className={`w-14 h-14 mx-auto rounded-2xl ${p.bgColor} flex items-center justify-center mb-3`}>
                  <Icon className={`w-7 h-7 ${p.color}`} />
                </div>
                <CardTitle className="text-xl">{p.name}</CardTitle>
                <p className="text-3xl font-bold mt-2">{p.price}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                  {p.notIncluded.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                      <Check className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Plano Atual
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(PLANS[p.key as keyof typeof PLANS].price_id, p.key!)}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === p.key ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {subscribed ? 'Trocar Plano' : 'Assinar'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
