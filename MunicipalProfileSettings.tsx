import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMunicipalProfile } from '@/hooks/useMunicipalProfile';
import { useMunicipalUpload } from '@/hooks/useMunicipalUpload';

export default function MunicipalProfileSettings() {
  const { profile, refetch } = useMunicipalProfile();
  const { toast } = useToast();
  const { upload, uploading } = useMunicipalUpload();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'logo' | 'cover' | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setDescription(profile.description || '');
      setLogoUrl(profile.logo_url || '');
      setCoverUrl((profile as any).cover_url || '');
    }
  }, [profile]);

  const handleUpload = async (file: File, field: 'logo' | 'cover') => {
    setUploadingField(field);
    const url = await upload(file, `profile/${field}`);
    if (url) {
      if (field === 'logo') setLogoUrl(url);
      else setCoverUrl(url);
    }
    setUploadingField(null);
  };

  const handleSave = async () => {
    if (!profile || !name) return;
    setSaving(true);

    const { error } = await supabase
      .from('municipal_profiles' as any)
      .update({
        name,
        description: description || null,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
      })
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Perfil atualizado!' });
      refetch();
    }
  };

  if (!profile) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Perfil da Prefeitura</h1>
        <p className="text-muted-foreground">Personalize o logotipo e a capa que aparecem na página de Utilidade Pública.</p>
      </div>

      {/* Cover Image */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Capa de Fundo</Label>
        <p className="text-sm text-muted-foreground">Imagem horizontal exibida no topo da página. Recomendado: 1200×400px.</p>
        {coverUrl ? (
          <div className="relative rounded-xl overflow-hidden border">
            <img src={coverUrl} alt="Capa" className="w-full h-48 object-cover" />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => coverInputRef.current?.click()}>
                <Camera className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => setCoverUrl('')}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => coverInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors h-48 flex flex-col items-center justify-center"
          >
            {uploadingField === 'cover' ? (
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImageIcon className="w-10 h-10 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Clique para enviar a imagem de capa</p>
                <p className="text-xs text-muted-foreground mt-1">Formato horizontal (ex: 1200×400)</p>
              </>
            )}
          </div>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f, 'cover');
          e.target.value = '';
        }} />
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Logotipo</Label>
        <p className="text-sm text-muted-foreground">Imagem quadrada, como um perfil. Recomendado: 200×200px.</p>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative">
              <img src={logoUrl} alt="Logo" className="w-24 h-24 rounded-xl object-cover border" />
              <div className="absolute -top-2 -right-2 flex gap-1">
                <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => logoInputRef.current?.click()}>
                  <Camera className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => setLogoUrl('')}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-24 h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
            >
              {uploadingField === 'logo' ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Logo</span>
                </>
              )}
            </div>
          )}
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f, 'logo');
          e.target.value = '';
        }} />
      </div>

      {/* Name & Description */}
      <div className="space-y-2">
        <Label>Nome da Prefeitura</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Prefeitura de..." />
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Uma breve descrição sobre a prefeitura..." rows={3} />
      </div>

      {/* Preview */}
      {(coverUrl || logoUrl) && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">Pré-visualização</Label>
          <div className="rounded-xl overflow-hidden border">
            <div className="relative">
              {coverUrl ? (
                <img src={coverUrl} alt="Capa" className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gradient-to-r from-primary/20 to-primary/5" />
              )}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="absolute -bottom-8 left-6 w-16 h-16 rounded-xl object-cover border-4 border-background shadow-md"
                />
              )}
            </div>
            <div className="pt-10 pb-4 px-6">
              <p className="font-bold">{name || 'Nome da Prefeitura'}</p>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || uploading || !name} className="w-full sm:w-auto">
        {saving ? 'Salvando...' : 'Salvar Perfil'}
      </Button>
    </div>
  );
}
