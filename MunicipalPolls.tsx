import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, Loader2, BarChart3, X, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMunicipalProfile } from '@/hooks/useMunicipalProfile';
import { useMunicipalUpload } from '@/hooks/useMunicipalUpload';

interface PollOption {
  id?: string;
  option_text: string;
  display_order: number;
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  options?: PollOption[];
  vote_counts?: Record<string, number>;
  total_votes?: number;
}

export default function MunicipalPolls() {
  const { profile } = useMunicipalProfile();
  const { toast } = useToast();
  const { upload, uploading } = useMunicipalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Poll | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    if (profile) fetchPolls();
  }, [profile]);

  const fetchPolls = async () => {
    const { data: pollsData } = await supabase
      .from('municipal_polls' as any)
      .select('*')
      .eq('municipal_profile_id', profile!.id)
      .order('created_at', { ascending: false });

    const polls = (pollsData as unknown as Poll[]) || [];

    for (const poll of polls) {
      const { data: opts } = await supabase
        .from('municipal_poll_options' as any)
        .select('*')
        .eq('poll_id', poll.id)
        .order('display_order');
      poll.options = (opts as unknown as PollOption[]) || [];

      const { data: counts } = await supabase.rpc('get_poll_vote_counts', { p_poll_id: poll.id });
      const voteCounts: Record<string, number> = {};
      let total = 0;
      ((counts as any[]) || []).forEach((c: any) => {
        voteCounts[c.option_id] = Number(c.vote_count);
        total += Number(c.vote_count);
      });
      poll.vote_counts = voteCounts;
      poll.total_votes = total;
    }

    setPolls(polls);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setDescription(''); setImageUrl(''); setIsActive(true); setStartsAt(''); setEndsAt('');
    setOptions(['', '']);
    setShowDialog(true);
  };

  const openEdit = (poll: Poll) => {
    setEditing(poll);
    setTitle(poll.title); setDescription(poll.description || ''); setImageUrl(poll.image_url || '');
    setIsActive(poll.is_active);
    setStartsAt(poll.starts_at ? poll.starts_at.slice(0, 16) : '');
    setEndsAt(poll.ends_at ? poll.ends_at.slice(0, 16) : '');
    setOptions(poll.options?.map(o => o.option_text) || ['', '']);
    setShowDialog(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, 'polls');
    if (url) setImageUrl(url);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!title || !profile || options.filter(o => o.trim()).length < 2) return;
    setSaving(true);

    const pollPayload = {
      municipal_profile_id: profile.id,
      title, description: description || null, image_url: imageUrl || null,
      is_active: isActive, starts_at: startsAt || null, ends_at: endsAt || null,
    };

    let pollId: string;

    if (editing) {
      const { error } = await supabase.from('municipal_polls' as any).update(pollPayload).eq('id', editing.id);
      if (error) { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); setSaving(false); return; }
      pollId = editing.id;
      await supabase.from('municipal_poll_options' as any).delete().eq('poll_id', pollId);
    } else {
      const { data, error } = await supabase.from('municipal_polls' as any).insert(pollPayload).select('id').single();
      if (error || !data) { toast({ title: 'Erro ao criar', variant: 'destructive' }); setSaving(false); return; }
      pollId = (data as any).id;
    }

    const validOptions = options.filter(o => o.trim());
    const optionsPayload = validOptions.map((text, i) => ({
      poll_id: pollId, option_text: text.trim(), display_order: i,
    }));
    await supabase.from('municipal_poll_options' as any).insert(optionsPayload);

    toast({ title: editing ? 'Enquete atualizada!' : 'Enquete criada!' });
    setSaving(false); setShowDialog(false); fetchPolls();
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('municipal_polls' as any).delete().eq('id', deleteId);
    toast({ title: 'Enquete removida' }); setDeleteId(null); fetchPolls();
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) => {
    const copy = [...options];
    copy[i] = val;
    setOptions(copy);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enquetes</h1>
          <p className="text-muted-foreground">Crie enquetes e acompanhe os resultados.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nova Enquete</Button>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma enquete cadastrada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {polls.map((poll) => (
            <div key={poll.id} className="glass rounded-xl overflow-hidden">
              {poll.image_url && (
                <img src={poll.image_url} alt="" className="w-full h-36 object-cover" />
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{poll.title}</h3>
                      <Badge variant={poll.is_active ? 'default' : 'secondary'}>
                        {poll.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    {poll.description && <p className="text-sm text-muted-foreground">{poll.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{poll.total_votes || 0} votos</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(poll)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(poll.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>

                {poll.options && poll.options.length > 0 && (
                  <div className="space-y-2">
                    {poll.options.map((opt) => {
                      const count = poll.vote_counts?.[opt.id!] || 0;
                      const pct = poll.total_votes ? Math.round((count / poll.total_votes) * 100) : 0;
                      return (
                        <div key={opt.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{opt.option_text}</span>
                            <span className="text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Enquete' : 'Nova Enquete'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label>Imagem de Capa (opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Imagem horizontal exibida no topo do card da enquete.</p>
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
            <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Qual obra é prioridade?" /></div>
            <div><Label>Descrição (opcional)</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div><Label>Início (opcional)</Label><Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} /></div>
            <div><Label>Término (opcional)</Label><Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Ativa</Label></div>
            
            <div>
              <Label>Opções</Label>
              <div className="space-y-2 mt-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={opt} onChange={e => updateOption(i, e.target.value)} placeholder={`Opção ${i + 1}`} />
                    {options.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => removeOption(i)}><X className="w-4 h-4" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addOption}><Plus className="w-3 h-3 mr-1" />Adicionar opção</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading || !title || options.filter(o => o.trim()).length < 2}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta enquete? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
