import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, Loader2, CalendarDays, Upload, X } from 'lucide-react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MunicipalEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
}

export default function MunicipalEvents() {
  const { profile } = useMunicipalProfile();
  const { toast } = useToast();
  const { upload, uploading } = useMunicipalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<MunicipalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<MunicipalEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) fetchEvents();
  }, [profile]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('municipal_events' as any)
      .select('*')
      .eq('municipal_profile_id', profile!.id)
      .order('event_date', { ascending: true });
    setEvents((data as unknown as MunicipalEvent[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setDescription(''); setEventDate(''); setEndDate(''); setLocation(''); setImageUrl(''); setImagePreview(''); setLinkUrl(''); setIsActive(true);
    setShowDialog(true);
  };

  const openEdit = (e: MunicipalEvent) => {
    setEditing(e);
    setTitle(e.title); setDescription(e.description || '');
    setEventDate(e.event_date ? e.event_date.slice(0, 16) : '');
    setEndDate(e.end_date ? e.end_date.slice(0, 16) : '');
    setLocation(e.location || ''); setImageUrl(e.image_url || ''); setImagePreview(e.image_url || ''); setLinkUrl(e.link_url || ''); setIsActive(e.is_active);
    setShowDialog(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, 'events');
    if (url) {
      setImageUrl(url);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setImageUrl(''); setImagePreview('');
  };

  const handleSave = async () => {
    if (!title || !eventDate || !profile) return;
    setSaving(true);

    const payload = {
      municipal_profile_id: profile.id,
      title, description: description || null, event_date: eventDate,
      end_date: endDate || null, location: location || null,
      image_url: imageUrl || null, link_url: linkUrl || null, is_active: isActive,
    };

    if (editing) {
      const { error } = await supabase.from('municipal_events' as any).update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      else toast({ title: 'Evento atualizado!' });
    } else {
      const { error } = await supabase.from('municipal_events' as any).insert(payload);
      if (error) toast({ title: 'Erro ao criar', variant: 'destructive' });
      else toast({ title: 'Evento criado!' });
    }

    setSaving(false); setShowDialog(false); fetchEvents();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('municipal_events' as any).delete().eq('id', deleteId);
    toast({ title: 'Evento removido' }); setDeleteId(null); fetchEvents();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Eventos e agenda do município.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Evento</Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum evento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {events.map((e) => (
            <div key={e.id} className="glass rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {e.image_url && <img src={e.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(e.event_date), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {e.location && <p className="text-xs text-muted-foreground">{e.location}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Festa Junina 2026" /></div>
            <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div><Label>Data e Hora</Label><Input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} /></div>
            <div><Label>Data de Término (opcional)</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <div><Label>Local</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Praça Central" /></div>
            <div>
              <Label>Foto do Evento</Label>
              {imagePreview ? (
                <div className="mt-2 relative inline-block">
                  <img src={imagePreview} alt="Preview" className="w-full max-w-xs h-40 rounded-lg object-cover border" />
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeImage}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Clique para enviar uma foto</p>
                    </>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div><Label>Link (opcional)</Label><Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading || !title || !eventDate}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
