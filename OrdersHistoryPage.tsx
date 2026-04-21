import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Store,
  Calendar,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  subtotal: number;
  total: number;
  items: OrderItem[];
  notes: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Pendente', 
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    icon: <Clock className="w-4 h-4" />
  },
  confirmed: { 
    label: 'Confirmado', 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: <CheckCircle className="w-4 h-4" />
  },
  preparing: { 
    label: 'Preparando', 
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    icon: <Package className="w-4 h-4" />
  },
  shipped: { 
    label: 'Enviado', 
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    icon: <Truck className="w-4 h-4" />
  },
  delivered: { 
    label: 'Entregue', 
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: <CheckCircle className="w-4 h-4" />
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: <XCircle className="w-4 h-4" />
  },
};

const statusSteps = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

export default function OrdersHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();

      // Subscribe to realtime updates for user's orders
      const channel = supabase
        .channel('customer-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        subtotal,
        total,
        items,
        notes,
        store:stores(id, name, slug, logo_url)
      `)
      .eq('customer_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedOrders = data.map(order => ({
        ...order,
        items: order.items as unknown as OrderItem[],
        store: order.store as unknown as Order['store']
      }));
      setOrders(formattedOrders);
    }
    setLoading(false);
  };

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const getStatusStep = (status: string) => {
    return statusSteps.indexOf(status);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-full bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Meus Pedidos</h1>
            <p className="text-muted-foreground">Acompanhe o status dos seus pedidos</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h2>
              <p className="text-muted-foreground mb-4">
                Você ainda não realizou nenhum pedido
              </p>
              <Button onClick={() => navigate('/')}>
                Explorar Lojas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const isExpanded = expandedOrders.has(order.id);
              const status = statusConfig[order.status] || statusConfig.pending;
              const currentStep = getStatusStep(order.status);
              const isCancelled = order.status === 'cancelled';
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {order.store?.logo_url ? (
                            <img 
                              src={order.store.logo_url} 
                              alt={order.store.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{order.store?.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(order.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={`${status.color} border flex items-center gap-1`}>
                          {status.icon}
                          {status.label}
                        </Badge>
                        <span className="font-bold text-primary">
                          R$ {order.total.toFixed(2).replace('.', ',')}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="border-t">
                      {/* Status Timeline */}
                      {!isCancelled && (
                        <div className="py-6">
                          <h4 className="font-medium mb-4">Acompanhamento</h4>
                          <div className="flex items-center justify-between relative">
                            {/* Progress Line */}
                            <div className="absolute top-4 left-0 right-0 h-1 bg-muted">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
                              />
                            </div>
                            
                            {statusSteps.map((step, index) => {
                              const stepConfig = statusConfig[step];
                              const isCompleted = index <= currentStep;
                              const isCurrent = index === currentStep;
                              
                              return (
                                <div key={step} className="flex flex-col items-center z-10">
                                  <div 
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                      isCompleted 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted text-muted-foreground'
                                    } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                                  >
                                    {stepConfig.icon}
                                  </div>
                                  <span className={`text-xs mt-2 ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                    {stepConfig.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <Separator className="my-4" />
                      
                      {/* Order Items */}
                      <div>
                        <h4 className="font-medium mb-3">Itens do Pedido</h4>
                        <div className="space-y-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity}x R$ {item.price.toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                              <span className="font-medium">
                                R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      {/* Order Summary */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>R$ {order.subtotal.toFixed(2).replace('.', ',')}</span>
                        </div>
                        {order.subtotal !== order.total && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Desconto</span>
                            <span>-R$ {(order.subtotal - order.total).toFixed(2).replace('.', ',')}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                          <span>Total</span>
                          <span className="text-primary">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>
                      
                      {order.notes && (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <h4 className="font-medium mb-2">Observações</h4>
                            <p className="text-sm text-muted-foreground">{order.notes}</p>
                          </div>
                        </>
                      )}
                      
                      {/* Actions */}
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/loja/${order.store?.slug}`)}
                        >
                          <Store className="w-4 h-4 mr-2" />
                          Ver Loja
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
