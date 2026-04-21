import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Link2, Briefcase, CalendarDays, BarChart3, LogOut, Menu, X, Landmark, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMunicipalProfile } from '@/hooks/useMunicipalProfile';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';

export default function MunicipalDashboard() {
  const { user, signOut, loading } = useAuth();
  const { profile, loading: profileLoading } = useMunicipalProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMunicipalAdmin, setIsMunicipalAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkRole();
    }
  }, [user]);

  const checkRole = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'municipal_admin')
      .maybeSingle();

    setIsMunicipalAdmin(!!data);
    setCheckingRole(false);

    if (!data) {
      navigate('/');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || checkingRole || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verificando permissões...</div>
      </div>
    );
  }

  if (!isMunicipalAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Landmark className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">Você não tem permissão para acessar esta área.</p>
          <Button onClick={() => navigate('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Serviços', href: '/prefeitura/servicos', icon: Briefcase },
    { name: 'Tudo na Mão', href: '/prefeitura', icon: Link2 },
    { name: 'Agenda', href: '/prefeitura/agenda', icon: CalendarDays },
    { name: 'Enquetes', href: '/prefeitura/enquetes', icon: BarChart3 },
    { name: 'Perfil', href: '/prefeitura/perfil', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/prefeitura') return location.pathname === '/prefeitura';
    if (href === '/prefeitura/servicos') return location.pathname === '/prefeitura/servicos';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-2">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Painel Municipal</span>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40
        transform transition-transform duration-300 ease-in-out flex flex-col
        md:translate-x-0 ${sidebarOpen ? 'translate-x-0 pt-14' : '-translate-x-full'} md:pt-0
      `}>
        <div className="p-6 flex-shrink-0 overflow-hidden">
          <Link to="/" className="block mb-2">
            <img src={logo} alt="Logo" className="h-10 hidden md:block" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Landmark className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-semibold text-primary truncate">Prefeitura</span>
          </div>
          {profile && (
            <p className="text-sm text-muted-foreground mt-1 truncate">{profile.name}</p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 pb-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-border bg-card">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="md:ml-64 pt-16 md:pt-0 min-h-screen">
        <div className="p-6">
          <Outlet context={{ profile }} />
        </div>
      </main>
    </div>
  );
}
