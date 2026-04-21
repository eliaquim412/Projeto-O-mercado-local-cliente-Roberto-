import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Store, Package, ShoppingCart, Settings, BarChart3, LogOut, Menu, X, Ticket, MessageCircle, Image, Coins, Gift, Monitor, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import PlanSelectionModal from '@/components/dashboard/PlanSelectionModal';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_zipcode: string | null;
  city_id: string | null;
  is_active: boolean;
  points_program_enabled: boolean;
}

export default function MerchantDashboard() {
  const { user, signOut, loading } = useAuth();
  const { canAccessCoupons, canAccessLoyalty, canAccessSystems } = useSubscription();
  const { unreadCount } = useUnreadMessages();
  const navigate = useNavigate();
  const location = useLocation();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const { needsPlanSelection, loading: subLoading } = useSubscription();

  // Redirect to plans page if merchant needs to select a plan
  useEffect(() => {
    if (!subLoading && needsPlanSelection && location.pathname !== '/dashboard/planos') {
      navigate('/dashboard/planos');
    }
  }, [subLoading, needsPlanSelection, location.pathname, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserTypeAndStore();
    }
  }, [user]);

  const fetchUserTypeAndStore = async () => {
    // First check user type from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user?.id)
      .maybeSingle();
    
    setUserType(profile?.user_type || null);

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!roleData;

    // If user is a consumer and NOT admin, redirect to home
    if (profile?.user_type === 'consumer' && !isAdmin) {
      navigate('/');
      return;
    }

    // Fetch store for merchants
    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', user?.id)
      .maybeSingle();

    setStore(storeData as StoreData | null);
    setLoadingStore(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || loadingStore) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const allNavItems = [
    { name: 'Visão Geral', href: '/dashboard', icon: BarChart3, badge: 0 },
    { name: 'Planos', href: '/dashboard/planos', icon: CreditCard, badge: 0 },
    { name: 'Minha Loja', href: '/dashboard/loja', icon: Store, badge: 0 },
    { name: 'Produtos', href: '/dashboard/produtos', icon: Package, badge: 0 },
    { name: 'Cupons', href: '/dashboard/cupons', icon: Ticket, badge: 0, requiresCoupons: true },
    { name: 'Banner', href: '/dashboard/banner', icon: Image, badge: 0 },
    { name: 'Pontos', href: '/dashboard/pontos', icon: Coins, badge: 0, requiresLoyalty: true },
    { name: 'Recompensas', href: '/dashboard/recompensas', icon: Gift, badge: 0, requiresLoyalty: true },
    { name: 'Mensagens', href: '/dashboard/mensagens', icon: MessageCircle, badge: unreadCount },
    { name: 'Pedidos', href: '/dashboard/pedidos', icon: ShoppingCart, badge: 0 },
    { name: 'Sistemas', href: '/dashboard/sistemas', icon: Monitor, badge: 0, requiresSystems: true },
    { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, badge: 0 },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.requiresCoupons && !canAccessCoupons) return false;
    if (item.requiresLoyalty && !canAccessLoyalty) return false;
    if (item.requiresSystems && !canAccessSystems) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <img src={logo} alt="Logo" className="h-8" />
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40
        transform transition-transform duration-300 ease-in-out
        md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <Link to="/" className="block">
            <img src={logo} alt="Logo" className="h-10 hidden md:block" />
          </Link>
        </div>

        {/* Store Info */}
        {store && (
          <div className="px-4 mb-6">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{store.name}</p>
                  <p className={`text-xs ${store.is_active ? 'text-green-500' : 'text-yellow-500'}`}>
                    {store.is_active ? 'Ativa' : 'Pendente'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="px-4 space-y-1 flex-1 overflow-y-auto pb-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
              {item.badge > 0 && (
                <Badge variant="default" className="h-5 min-w-[20px] justify-center text-xs">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          {store && (
            <Link
              to={`/loja/${store.slug}`}
              target="_blank"
              className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver minha loja
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Plan Selection Modal */}
      <PlanSelectionModal open={needsPlanSelection && !subLoading && location.pathname !== '/dashboard/planos'} />

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="md:ml-64 pt-16 md:pt-0 min-h-screen">
        <div className="p-6">
          <Outlet context={{ store, refreshStore: fetchUserTypeAndStore }} />
        </div>
      </main>
    </div>
  );
}
