import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Package, ShoppingCart, TrendingUp, Eye, Users, Star, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardContext {
  store: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
}

export default function DashboardOverview() {
  const { store } = useOutletContext<DashboardContext>();

  if (!store) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bem-vindo ao Painel do Lojista</h1>
          <p className="text-muted-foreground">Crie sua loja para começar a vender.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 text-center max-w-md mx-auto"
        >
          <Store className="w-16 h-16 mx-auto text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Crie sua loja</h2>
          <p className="text-muted-foreground mb-6">
            Configure sua loja para começar a vender seus produtos no marketplace.
          </p>
          <Button asChild className="button-gradient">
            <Link to="/dashboard/loja">
              Criar Loja <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  const stats = [
    { label: 'Visualizações', value: '0', icon: Eye, color: 'text-blue-500' },
    { label: 'Seguidores', value: '0', icon: Users, color: 'text-green-500' },
    { label: 'Produtos', value: '0', icon: Package, color: 'text-purple-500' },
    { label: 'Pedidos', value: '0', icon: ShoppingCart, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visão Geral</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho da sua loja.</p>
        </div>
        {!store.is_active && (
          <div className="px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm">
            Loja aguardando aprovação
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Adicione produtos para começar a vender.
            </p>
            <Button asChild>
              <Link to="/dashboard/produtos">
                Gerenciar Produtos <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Acompanhe e gerencie os pedidos recebidos.
            </p>
            <Button asChild variant="outline">
              <Link to="/dashboard/pedidos">
                Ver Pedidos <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
