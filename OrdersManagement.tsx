import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Clock, CheckCircle, Truck, Package, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface StoreData {
  id: string;
}

interface DashboardContext {
  store: StoreData | null;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-500/10 text-yellow-500' },
  confirmed: { label: 'Confirmado', icon: CheckCircle, color: 'bg-blue-500/10 text-blue-500' },
  preparing: { label: 'Em preparo', icon: Package, color: 'bg-purple-500/10 text-purple-500' },
  shipped: { label: 'Enviado', icon: Truck, color: 'bg-orange-500/10 text-orange-500' },
  delivered: { label: 'Entregue', icon: CheckCircle, color: 'bg-green-500/10 text-green-500' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'bg-red-500/10 text-red-500' },
};

export default function OrdersManagement() {
  const { store } = useOutletContext<DashboardContext>();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (store) {
      fetchOrders();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('store-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `store_id=eq.${store.id}`
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [store]);

  const fetchOrders = async () => {
    if (!store) return;

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    setOrders((data as unknown as Order[]) || []);
    setLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado!' });
      fetchOrders();
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  if (!store) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Crie sua loja primeiro</h2>
        <p className="text-muted-foreground">Você precisa criar uma loja para ver pedidos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie os pedidos recebidos.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="preparing">Em preparo</SelectItem>
            <SelectItem value="shipped">Enviados</SelectItem>
            <SelectItem value="delivered">Entregues</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando pedidos...</div>
      ) : filteredOrders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 text-center"
        >
          <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {filter === 'all' ? 'Nenhum pedido ainda' : 'Nenhum pedido encontrado'}
          </h2>
          <p className="text-muted-foreground">
            {filter === 'all' 
              ? 'Os pedidos aparecerão aqui quando os clientes comprarem seus produtos.'
              : 'Tente alterar o filtro para ver outros pedidos.'
            }
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => {
            const status = statusConfig[order.status];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass rounded-xl p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>

                    <h3 className="font-semibold">{order.customer_name}</h3>
                    <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                    {order.customer_email && (
                      <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                    )}

                    <div className="mt-4 space-y-1">
                      <p className="text-sm font-medium">Itens:</p>
                      {(order.items as OrderItem[]).map((item, i) => (
                        <p key={i} className="text-sm text-muted-foreground">
                          {item.quantity}x {item.name} - R$ {item.price.toFixed(2).replace('.', ',')}
                        </p>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        <strong>Obs:</strong> {order.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      R$ {order.total.toFixed(2).replace('.', ',')}
                    </p>
                    {order.shipping_cost > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Frete: R$ {order.shipping_cost.toFixed(2).replace('.', ',')}
                      </p>
                    )}

                    <div className="mt-4">
                      <Select
                        value={order.status}
                        onValueChange={(value) => updateStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="preparing">Em preparo</SelectItem>
                          <SelectItem value="shipped">Enviado</SelectItem>
                          <SelectItem value="delivered">Entregue</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
