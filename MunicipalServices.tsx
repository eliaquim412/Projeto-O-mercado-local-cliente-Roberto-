import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, Loader2, Briefcase, Upload, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMunicipalProfile } from '@/hooks/useMunicipalProfile';
import { useMunicipalUpload } from '@/hooks/useMunicipalUpload';

interface MunicipalService {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  link_url: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export default function MunicipalServices() {
  const { profile } = useMunicipalProfile();
  const { toast } = useToast();
  const { upload, uploading } = useMunicipalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [services, setServices] = useState<MunicipalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<MunicipalService | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('FileText');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (profile) fetchServices();
  }, [profile]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('municipal_services' as any)
      .select('*')
      .eq('municipal_profile_id', profile!.id)
      .order('display_order');
    setServices((data as unknown as MunicipalService[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setDescription(''); setIcon('FileText'); setLinkUrl(''); setImageUrl(''); setIsActive(true);
    setShowDialog(true);
  };

  const openEdit = (s: MunicipalService) => {
    setEditing(s);
    setTitle(s.title); setDescription(s.description || ''); setIcon(s.icon); setLinkUrl(s.link_url || '');
    setImageUrl(s.image_url || ''); setIsActive(s.is_active);
    setShowDialog(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, 'services');
    if (url) setImageUrl(url);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!title || !profile) return;
    setSaving(true);

    const payload = {
      municipal_profile_id: profile.id,
      title, description: description || null, icon, link_url: linkUrl || null,
      image_url: imageUrl || null,
      is_active: isActive, display_order: editing ? editing.display_order : services.length,
    };

    if (editing) {
      const { error } = await supabase.from('municipal_services' as any).update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      else toast({ title: 'Serviço atualizado!' });
    } else {
      const { error } = await supabase.from('municipal_services' as any).insert(payload);
      if (error) toast({ title: 'Erro ao criar', variant: 'destructive' });
      else toast({ title: 'Serviço criado!' });
    }

    setSaving(false); setShowDialog(false); fetchServices();
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('municipal_services' as any).delete().eq('id', deleteId);
    toast({ title: 'Serviço removido' }); setDeleteId(null); fetchServices();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">Cards de serviços públicos para a população.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Serviço</Button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum serviço cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {services.map((s) => (
            <div key={s.id} className="glass rounded-xl overflow-hidden flex">
              {s.image_url && (
                <img src={s.image_url} alt="" className="w-20 h-20 object-cover flex-shrink-0" />
              )}
              <div className="p-4 flex items-center justify-between flex-1 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium">{s.title}</p>
                  {s.description && <p className="text-sm text-muted-foreground line-clamp-1">{s.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={`text-xs ${s.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {s.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label>Imagem de Capa (opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Imagem horizontal que aparece no card do serviço.</p>
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border">
                  <img src={imageUrl} alt="Preview" className="w-full h-36 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setImageUrl('')}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Clique para enviar imagem</p>
                    </>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: IPTU 2ª Via" /></div>
            <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do serviço..." /></div>
            <div><Label>Ícone (nome Lucide)</Label><Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="FileText" /></div>
            <div><Label>URL do Link (opcional)</Label><Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading || !title}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
