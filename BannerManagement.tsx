import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Image, Upload, Trash2, Monitor, Smartphone, ExternalLink, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardContext {
  store: {
    id: string;
    name: string;
    slug: string;
  } | null;
  refreshStore: () => void;
}

interface StoreBanner {
  id: string;
  store_id: string;
  image_desktop_url: string;
  image_mobile_url: string;
  link_url: string | null;
  is_active: boolean;
}

export default function BannerManagement() {
  const { store } = useOutletContext<DashboardContext>();
  const [banner, setBanner] = useState<StoreBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (store) {
      fetchBanner();
    }
  }, [store]);

  const fetchBanner = async () => {
    if (!store) return;
    
    const { data, error } = await supabase
      .from('store_banners')
      .select('*')
      .eq('store_id', store.id)
      .maybeSingle();

    if (data) {
      setBanner(data);
      setDesktopPreview(data.image_desktop_url);
      setMobilePreview(data.image_mobile_url);
      setLinkUrl(data.link_url || '');
      setIsActive(data.is_active);
    }
    setLoading(false);
  };

  const uploadImage = async (file: File, type: 'desktop' | 'mobile'): Promise<string | null> => {
    if (!store) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${store.id}-banner-${type}-${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('store-assets')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('store-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleDesktopUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDesktopFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDesktopPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMobileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMobileFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMobilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!store) return;
    
    // For new banners, require both images to be uploaded
    if (!banner && (!desktopFile || !mobileFile)) {
      toast.error('Por favor, adicione as imagens de banner para desktop e mobile');
      return;
    }

    // For existing banners, check if we have valid URLs or new files
    if (banner && !desktopPreview && !desktopFile) {
      toast.error('Por favor, adicione a imagem de banner para desktop');
      return;
    }

    if (banner && !mobilePreview && !mobileFile) {
      toast.error('Por favor, adicione a imagem de banner para mobile');
      return;
    }

    setSaving(true);

    try {
      let desktopUrl = banner?.image_desktop_url || '';
      let mobileUrl = banner?.image_mobile_url || '';

      // Upload new images if selected
      if (desktopFile) {
        const url = await uploadImage(desktopFile, 'desktop');
        if (url) {
          desktopUrl = url;
        } else {
          toast.error('Erro ao fazer upload da imagem desktop');
          setSaving(false);
          return;
        }
      }

      if (mobileFile) {
        const url = await uploadImage(mobileFile, 'mobile');
        if (url) {
          mobileUrl = url;
        } else {
          toast.error('Erro ao fazer upload da imagem mobile');
          setSaving(false);
          return;
        }
      }

      // Final validation - ensure URLs are not empty
      if (!desktopUrl || !mobileUrl) {
        toast.error('As imagens precisam ser enviadas corretamente');
        setSaving(false);
        return;
      }

      const bannerData = {
        store_id: store.id,
        image_desktop_url: desktopUrl,
        image_mobile_url: mobileUrl,
        link_url: linkUrl || null,
        is_active: isActive,
      };

      if (banner) {
        // Update existing
        const { error } = await supabase
          .from('store_banners')
          .update(bannerData)
          .eq('id', banner.id);

        if (error) throw error;
        toast.success('Banner atualizado com sucesso!');
      } else {
        // Create new
        const { error } = await supabase
          .from('store_banners')
          .insert(bannerData);

        if (error) throw error;
        toast.success('Banner criado com sucesso!');
      }

      setDesktopFile(null);
      setMobileFile(null);
      fetchBanner();
    } catch (error: any) {
      console.error('Error saving banner:', error);
      toast.error('Erro ao salvar banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!banner) return;

    if (!confirm('Tem certeza que deseja remover o banner?')) return;

    try {
      const { error } = await supabase
        .from('store_banners')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;

      setBanner(null);
      setDesktopPreview(null);
      setMobilePreview(null);
      setDesktopFile(null);
      setMobileFile(null);
      setLinkUrl('');
      setIsActive(true);
      toast.success('Banner removido com sucesso!');
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Erro ao remover banner');
    }
  };

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Você precisa criar uma loja primeiro.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">Banner Promocional</h1>
        <p className="text-muted-foreground">
          Configure o banner da sua loja que aparecerá na página inicial do marketplace.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Dica:</strong> Use imagens de alta qualidade. Recomendamos <strong>1920x600px</strong> para desktop e <strong>640x400px</strong> para mobile.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Desktop Banner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Banner Desktop
            </CardTitle>
            <CardDescription>Imagem exibida em computadores (1920x600px)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {desktopPreview ? (
                <div className="relative aspect-[16/5] rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={desktopPreview}
                    alt="Banner Desktop"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setDesktopPreview(null);
                      setDesktopFile(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-[16/5] rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors bg-muted/50">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para enviar</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleDesktopUpload}
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Banner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Banner Mobile
            </CardTitle>
            <CardDescription>Imagem exibida em celulares (640x400px)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mobilePreview ? (
                <div className="relative aspect-[8/5] rounded-lg overflow-hidden border border-border bg-muted max-w-[200px] mx-auto">
                  <img
                    src={mobilePreview}
                    alt="Banner Mobile"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 w-6 h-6"
                    onClick={() => {
                      setMobilePreview(null);
                      setMobileFile(null);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-[8/5] rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors bg-muted/50 max-w-[200px] mx-auto">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para enviar</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMobileUpload}
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="link">Link de destino (opcional)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="link"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Quando o usuário clicar no banner, será redirecionado para este link.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Banner ativo</Label>
              <p className="text-sm text-muted-foreground">
                Desative para esconder o banner temporariamente
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={saving || (!desktopPreview && !mobilePreview)}
          className="button-gradient"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : banner ? 'Atualizar Banner' : 'Criar Banner'}
        </Button>

        {banner && (
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Remover Banner
          </Button>
        )}
      </div>
    </motion.div>
  );
}
