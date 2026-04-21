import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Lock, CheckCircle, Clock, Eye, EyeOff, ExternalLink, XCircle } from 'lucide-react';

interface SystemLink {
  id: string;
  title: string;
  url: string;
}

interface AccessRequest {
  id: string;
  system_link_id: string;
  status: string;
  access_login: string | null;
  access_password: string | null;
  created_at: string;
}

export default function SystemsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<SystemLink[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [linksRes, requestsRes] = await Promise.all([
      supabase.from('system_links').select('id, title, url').eq('is_active', true),
      supabase.from('system_access_requests').select('*').eq('merchant_id', user!.id),
    ]);
    setLinks((linksRes.data as SystemLink[]) || []);
    setRequests((requestsRes.data as AccessRequest[]) || []);
    setLoading(false);
  };

  const getRequestForLink = (linkId: string) => {
    return requests.find(r => r.system_link_id === linkId);
  };

  const handleRequestAccess = async (linkId: string) => {
    const { error } = await supabase.from('system_access_requests').insert({
      system_link_id: linkId,
      merchant_id: user!.id,
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Você já solicitou acesso a este sistema', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao solicitar acesso', variant: 'destructive' });
      }
      return;
    }

    toast({ title: 'Solicitação enviada com sucesso!' });
    fetchData();
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sistemas</h1>
        <p className="text-muted-foreground">Solicite acesso aos sistemas disponíveis</p>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum sistema disponível no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map(link => {
            const request = getRequestForLink(link.id);
            const isApproved = request?.status === 'approved';
            const isPending = request?.status === 'pending';
            const isRejected = request?.status === 'rejected';

            return (
              <Card key={link.id} className="relative overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">{link.title}</h3>
                    </div>
                    {isApproved && <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Aprovado</Badge>}
                    {isPending && <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendente</Badge>}
                    {isRejected && <Badge variant="destructive">Rejeitado</Badge>}
                  </div>

                  {isApproved && request?.access_login && (
                    <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                      <div>
                        <p className="text-xs text-muted-foreground">Login</p>
                        <p className="text-sm font-mono">{request.access_login}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Senha</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono flex-1">
                            {visiblePasswords.has(request.id)
                              ? request.access_password
                              : '••••••••'}
                          </p>
                          <button onClick={() => togglePassword(request.id)} className="text-muted-foreground hover:text-foreground">
                            {visiblePasswords.has(request.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button size="sm" className="w-full mt-2" onClick={() => window.open(link.url, '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" /> Acessar Sistema
                      </Button>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <p className="text-sm text-muted-foreground">Aguardando aprovação do administrador</p>
                    </div>
                  )}

                  {isRejected && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <XCircle className="w-4 h-4 text-destructive" />
                      <p className="text-sm text-muted-foreground">Solicitação rejeitada</p>
                    </div>
                  )}

                  {!request && (
                    <Button className="w-full" variant="outline" onClick={() => handleRequestAccess(link.id)}>
                      <Lock className="w-4 h-4 mr-2" /> Solicitar Acesso
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
