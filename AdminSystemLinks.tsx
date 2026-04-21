import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Link as LinkIcon, ExternalLink, Eye, EyeOff, Clock, CheckCircle, XCircle } from 'lucide-react';

interface SystemLink {
  id: string;
  title: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

interface AccessRequest {
  id: string;
  system_link_id: string;
  merchant_id: string;
  status: string;
  access_login: string | null;
  access_password: string | null;
  created_at: string;
  responded_at: string | null;
  merchant_name?: string;
  system_title?: string;
}

export default function AdminSystemLinks() {
  const { toast } = useToast();
  const [links, setLinks] = useState<SystemLink[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<SystemLink | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [linkForm, setLinkForm] = useState({ title: '', url: '' });
  const [responseForm, setResponseForm] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [linksRes, requestsRes] = await Promise.all([
      supabase.from('system_links').select('*').order('created_at', { ascending: false }),
      supabase.from('system_access_requests').select('*').order('created_at', { ascending: false }),
    ]);

    setLinks((linksRes.data as SystemLink[]) || []);

    // Enrich requests with merchant names and system titles
    const rawRequests = (requestsRes.data || []) as AccessRequest[];
    if (rawRequests.length > 0) {
      const merchantIds = [...new Set(rawRequests.map(r => r.merchant_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', merchantIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
      const linkMap = new Map((linksRes.data as SystemLink[] || []).map(l => [l.id, l.title]));

      rawRequests.forEach(r => {
        r.merchant_name = profileMap.get(r.merchant_id) || 'Desconhecido';
        r.system_title = linkMap.get(r.system_link_id) || 'Sistema removido';
      });
    }

    setRequests(rawRequests);
    setLoading(false);
  };

  const handleSaveLink = async () => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    if (editingLink) {
      const { error } = await supabase
        .from('system_links')
        .update({ title: linkForm.title, url: linkForm.url })
        .eq('id', editingLink.id);
      if (error) {
        toast({ title: 'Erro ao atualizar', variant: 'destructive' });
        return;
      }
      toast({ title: 'Link atualizado com sucesso' });
    } else {
      const { error } = await supabase
        .from('system_links')
        .insert({ title: linkForm.title, url: linkForm.url });
      if (error) {
        toast({ title: 'Erro ao criar link', variant: 'destructive' });
        return;
      }
      toast({ title: 'Link criado com sucesso' });
    }

    setShowLinkDialog(false);
    setEditingLink(null);
    setLinkForm({ title: '', url: '' });
    fetchData();
  };

  const handleDeleteLink = async (id: string) => {
    const { error } = await supabase.from('system_links').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
      return;
    }
    toast({ title: 'Link excluído' });
    fetchData();
  };

  const handleToggleActive = async (link: SystemLink) => {
    await supabase.from('system_links').update({ is_active: !link.is_active }).eq('id', link.id);
    fetchData();
  };

  const handleSendAccess = async () => {
    if (!selectedRequest || !responseForm.login.trim() || !responseForm.password.trim()) {
      toast({ title: 'Preencha login e senha', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('system_access_requests')
      .update({
        access_login: responseForm.login,
        access_password: responseForm.password,
        status: 'approved',
        responded_at: new Date().toISOString(),
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({ title: 'Erro ao enviar acesso', variant: 'destructive' });
      return;
    }

    toast({ title: 'Acesso enviado com sucesso' });
    setShowResponseDialog(false);
    setSelectedRequest(null);
    setResponseForm({ login: '', password: '' });
    fetchData();
  };

  const handleRejectRequest = async (id: string) => {
    await supabase
      .from('system_access_requests')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('id', id);
    toast({ title: 'Solicitação rejeitada' });
    fetchData();
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const respondedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sistemas / Links</h1>
          <p className="text-muted-foreground">Gerencie links de sistemas para lojistas</p>
        </div>
        <Button onClick={() => { setEditingLink(null); setLinkForm({ title: '', url: '' }); setShowLinkDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Link
        </Button>
      </div>

      {/* Links List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LinkIcon className="w-5 h-5" /> Links Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum link cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <div key={link.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <Switch checked={link.is_active} onCheckedChange={() => handleToggleActive(link)} />
                    <div>
                      <p className="font-medium">{link.title}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-xs">{link.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => window.open(link.url, '_blank')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      setEditingLink(link);
                      setLinkForm({ title: link.title, url: link.url });
                      setShowLinkDialog(true);
                    }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteLink(link.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" /> Solicitações Pendentes
            {pendingRequests.length > 0 && (
              <Badge variant="destructive">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                  <div>
                    <p className="font-medium">{req.merchant_name}</p>
                    <p className="text-sm text-muted-foreground">Sistema: {req.system_title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => {
                      setSelectedRequest(req);
                      setResponseForm({ login: req.access_login || '', password: req.access_password || '' });
                      setShowResponseDialog(true);
                    }}>
                      Enviar Acesso
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectRequest(req.id)}>
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responded Requests */}
      {respondedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {respondedRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {req.status === 'approved' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium">{req.merchant_name}</p>
                      <p className="text-sm text-muted-foreground">Sistema: {req.system_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={req.status === 'approved' ? 'default' : 'destructive'}>
                      {req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </Badge>
                    {req.status === 'approved' && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedRequest(req);
                        setResponseForm({ login: req.access_login || '', password: req.access_password || '' });
                        setShowResponseDialog(true);
                      }}>
                        Editar Acesso
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Editar Link' : 'Novo Link'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título do Sistema</Label>
              <Input
                placeholder="Ex: Sistema de Delivery"
                value={linkForm.title}
                onChange={e => setLinkForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input
                placeholder="https://..."
                value={linkForm.url}
                onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveLink}>{editingLink ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Acesso</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm"><strong>Lojista:</strong> {selectedRequest.merchant_name}</p>
                <p className="text-sm"><strong>Sistema:</strong> {selectedRequest.system_title}</p>
              </div>
              <div>
                <Label>Login</Label>
                <Input
                  placeholder="Login de acesso"
                  value={responseForm.login}
                  onChange={e => setResponseForm(f => ({ ...f, login: e.target.value }))}
                />
              </div>
              <div>
                <Label>Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Senha de acesso"
                    value={responseForm.password}
                    onChange={e => setResponseForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>Cancelar</Button>
            <Button onClick={handleSendAccess}>Enviar Acesso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
