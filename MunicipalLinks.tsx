import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, GripVertical, ExternalLink, Loader2, Pencil, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMunicipalProfile } from '@/hooks/useMunicipalProfile';
import { useMunicipalUpload } from '@/hooks/useMunicipalUpload';

interface MunicipalLink {
  id: string;
  title: string;
  icon_url: string | null;
  link_url: string;
  display_order: number;
  is_active: boolean;
}

export default function MunicipalLinks() {
  const { profile } = useMunicipalProfile();
  const { toast } = useToast();
  const { upload, uploading } = useMunicipalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [links, setLinks] = useState<MunicipalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<MunicipalLink | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [iconPreview, setIconPreview] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) fetchLinks();
  }, [profile]);

  const fetchLinks = async () => {
    const { data } = await supabase
      .from('municipal_links' as any)
      .select('*')
      .eq('municipal_profile_id', profile!.id)
      .order('display_order');
    setLinks((data as unknown as MunicipalLink[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setIconUrl(''); setLinkUrl(''); setIsActive(true); setIconPreview('');
    setShowDialog(true);
  };

  const openEdit = (link: MunicipalLink) => {
    setEditing(link);
    setTitle(link.title); setIconUrl(link.icon_url || ''); setLinkUrl(link.link_url); setIsActive(link.is_active);
    setIconPreview(link.icon_url || '');
    setShowDialog(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, 'links');
    if (url) {
      setIconUrl(url);
      setIconPreview(url);
    }
  };

  const removeIcon = () => {
    setIconUrl(''); setIconPreview('');
  };

  const handleSave = async () => {
    if (!title || !linkUrl || !profile) return;
    setSaving(true);

    const payload = {
      municipal_profile_id: profile.id,
      title, icon_url: iconUrl || null, link_url: linkUrl,
      is_active: isActive, display_order: editing ? editing.display_order : links.length,
    };

    if (editing) {
      const { error } = await supabase.from('municipal_links' as any).update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      else toast({ title: 'Link atualizado!' });
    } else {
      const { error } = await supabase.from('municipal_links' as any).insert(payload);
      if (error) toast({ title: 'Erro ao criar', variant: 'destructive' });
      else toast({ title: 'Link criado!' });
    }

    setSaving(false); setShowDialog(false); fetchLinks();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('municipal_links' as any).delete().eq('id', deleteId);
    toast({ title: 'Link removido' }); setDeleteId(null); fetchLinks();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tudo na Mão</h1>
          <p className="text-muted-foreground">Links e logos para acesso rápido da população.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Link</Button>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ExternalLink className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum link cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {links.map((link) => (
            <div key={link.id} className="glass rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                {link.icon_url && <img src={link.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                <div>
                  <p className="font-medium">{link.title}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-xs">{link.link_url}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${link.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {link.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <Button variant="ghost" size="icon" onClick={() => openEdit(link)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(link.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Link' : 'Novo Link'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Portal da Transparência" /></div>
            <div>
              <Label>Logo / Ícone</Label>
              {iconPreview ? (
                <div className="mt-2 flex items-center gap-3">
                  <img src={iconPreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border" />
                  <Button variant="outline" size="sm" onClick={removeIcon}><X className="w-3 h-3 mr-1" />Remover</Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Clique para enviar uma imagem</p>
                    </>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div><Label>URL do Link</Label><Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading || !title || !linkUrl}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este link? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
