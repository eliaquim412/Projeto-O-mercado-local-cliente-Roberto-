import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Pencil, Trash2, Quote } from 'lucide-react';
import { toast } from 'sonner';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export default function AdminTestimonials() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState({ name: '', role: '', content: '', image_url: '', display_order: 0, is_active: true });
  const [uploading, setUploading] = useState(false);

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = { ...data, image_url: data.image_url || null };
      if (data.id) {
        const { error } = await supabase.from('testimonials').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('testimonials').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      toast.success(editing ? 'Depoimento atualizado!' : 'Depoimento criado!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao salvar depoimento'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      toast.success('Depoimento removido!');
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `testimonials/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store-assets').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('store-assets').getPublicUrl(path);
      setForm(f => ({ ...f, image_url: urlData.publicUrl }));
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Erro ao enviar imagem: ${error.message || 'Tente novamente'}`);
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', role: '', content: '', image_url: '', display_order: testimonials.length, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({ name: t.name, role: t.role, content: t.content, image_url: t.image_url || '', display_order: t.display_order, is_active: t.is_active });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, id: editing?.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Quote className="w-6 h-6 text-primary" /> Depoimentos</h1>
          <p className="text-muted-foreground">Gerencie os depoimentos exibidos na página inicial</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Novo Depoimento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Depoimento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div><Label>Ramo / Função</Label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required /></div>
              <div><Label>Depoimento</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required rows={4} /></div>
              <div>
                <Label>Foto</Label>
                <div className="flex items-center gap-4 mt-1">
                  {form.image_url && <Avatar className="h-12 w-12"><AvatarImage src={form.image_url} /><AvatarFallback>{form.name?.[0]}</AvatarFallback></Avatar>}
                  <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </div>
              </div>
              <div><Label>Ordem</Label><Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Ativo</Label></div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p> : testimonials.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhum depoimento cadastrado ainda.</Card>
      ) : (
        <div className="grid gap-4">
          {testimonials.map(t => (
            <Card key={t.id} className={`p-4 flex items-start gap-4 ${!t.is_active ? 'opacity-50' : ''}`}>
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={t.image_url || ''} />
                <AvatarFallback>{t.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{t.role}</p>
                <p className="text-sm mt-1 line-clamp-2">"{t.content}"</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
