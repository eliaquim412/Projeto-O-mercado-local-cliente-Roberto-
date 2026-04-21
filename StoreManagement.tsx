import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Store, Upload, Loader2, MapPin, Truck, Palette, MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface City {
  id: string;
  name: string;
  state: string;
}

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_zipcode: string | null;
  city_id: string | null;
  is_active: boolean;
  shipping_fee: number | null;
  free_shipping: boolean | null;
  background_color: string | null;
  cta_button_enabled: boolean;
  cta_button_title: string | null;
  cta_button_link: string | null;
}

interface DashboardContext {
  store: StoreData | null;
  refreshStore: () => Promise<void>;
}

const storeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().min(10, 'WhatsApp inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_zipcode: z.string().optional(),
  city_id: z.string().min(1, 'Selecione uma cidade'),
  free_shipping: z.boolean(),
  shipping_fee: z.string().optional(),
  background_color: z.string().optional(),
  cta_button_enabled: z.boolean(),
  cta_button_title: z.string().optional(),
  cta_button_link: z.string().optional(),
});

type StoreFormData = z.infer<typeof storeSchema>;

export default function StoreManagement() {
  const { store, refreshStore } = useOutletContext<DashboardContext>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      description: '',
      phone: '',
      whatsapp: '',
      email: '',
      address_street: '',
      address_number: '',
      address_neighborhood: '',
      address_zipcode: '',
      city_id: '',
      free_shipping: false,
      shipping_fee: '',
      background_color: '',
      cta_button_enabled: false,
      cta_button_title: '',
      cta_button_link: '',
    },
  });

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name || '',
        description: store.description || '',
        phone: store.phone || '',
        whatsapp: store.whatsapp || '',
        email: store.email || '',
        address_street: store.address_street || '',
        address_number: store.address_number || '',
        address_neighborhood: store.address_neighborhood || '',
        address_zipcode: store.address_zipcode || '',
        city_id: store.city_id || '',
        free_shipping: store.free_shipping || false,
        shipping_fee: store.shipping_fee?.toString() || '',
        background_color: store.background_color || '',
        cta_button_enabled: store.cta_button_enabled || false,
        cta_button_title: store.cta_button_title || '',
        cta_button_link: store.cta_button_link || '',
      });
      setLogoPreview(store.logo_url);
      setCoverPreview(store.cover_url);
    }
  }, [store]);

  const fetchCities = async () => {
    const { data } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setCities((data as City[]) || []);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const uploadImage = async (file: File, folder: string, storeId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${storeId}/${folder}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('store-assets')
      .upload(fileName, file, { upsert: true });

    if (error) {
      toast({ title: 'Erro ao fazer upload', description: error.message, variant: 'destructive' });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('store-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    if (store) {
      // If store exists, upload and save immediately
      setUploadingLogo(true);
      const url = await uploadImage(file, 'logo', store.id);
      if (url) {
        await supabase.from('stores').update({ logo_url: url }).eq('id', store.id);
        await refreshStore();
        toast({ title: 'Logo atualizado!' });
      }
      setUploadingLogo(false);
    } else {
      // If no store yet, save file for later upload
      setPendingLogoFile(file);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);

    if (store) {
      // If store exists, upload and save immediately
      setUploadingCover(true);
      const url = await uploadImage(file, 'cover', store.id);
      if (url) {
        await supabase.from('stores').update({ cover_url: url }).eq('id', store.id);
        await refreshStore();
        toast({ title: 'Capa atualizada!' });
      }
      setUploadingCover(false);
    } else {
      // If no store yet, save file for later upload
      setPendingCoverFile(file);
    }
  };

  const onSubmit = async (data: StoreFormData) => {
    if (!user) return;
    
    setLoading(true);

    if (store) {
      // Update existing store
      const shippingFeeValue = data.free_shipping ? 0 : (parseFloat(data.shipping_fee || '0') || 0);
      
      const { error } = await supabase
        .from('stores')
        .update({
          name: data.name,
          description: data.description || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          address_street: data.address_street || null,
          address_number: data.address_number || null,
          address_neighborhood: data.address_neighborhood || null,
          address_zipcode: data.address_zipcode || null,
          city_id: data.city_id,
          free_shipping: data.free_shipping,
          shipping_fee: shippingFeeValue,
          background_color: data.background_color || null,
          cta_button_enabled: data.cta_button_enabled,
          cta_button_title: data.cta_button_title || null,
          cta_button_link: data.cta_button_link || null,
        })
        .eq('id', store.id);

      if (error) {
        toast({ title: 'Erro ao atualizar loja', description: error.message, variant: 'destructive' });
      } else {
        await refreshStore();
        toast({ title: 'Loja atualizada com sucesso!' });
      }
    } else {
      // Create new store
      const slug = generateSlug(data.name);
      const shippingFeeValue = data.free_shipping ? 0 : (parseFloat(data.shipping_fee || '0') || 0);
      
      const { data: newStore, error } = await supabase
        .from('stores')
        .insert({
          owner_id: user.id,
          name: data.name,
          slug,
          description: data.description || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          address_street: data.address_street || null,
          address_number: data.address_number || null,
          address_neighborhood: data.address_neighborhood || null,
          address_zipcode: data.address_zipcode || null,
          city_id: data.city_id,
          is_active: true,
          free_shipping: data.free_shipping,
          shipping_fee: shippingFeeValue,
          background_color: data.background_color || null,
          cta_button_enabled: data.cta_button_enabled,
          cta_button_title: data.cta_button_title || null,
          cta_button_link: data.cta_button_link || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Este nome já está em uso', variant: 'destructive' });
        } else {
          toast({ title: 'Erro ao criar loja', description: error.message, variant: 'destructive' });
        }
      } else if (newStore) {
        // Upload pending images now that store exists
        let logoUrl: string | null = null;
        let coverUrl: string | null = null;

        if (pendingLogoFile) {
          logoUrl = await uploadImage(pendingLogoFile, 'logo', newStore.id);
        }
        if (pendingCoverFile) {
          coverUrl = await uploadImage(pendingCoverFile, 'cover', newStore.id);
        }

        // Update store with image URLs if any were uploaded
        if (logoUrl || coverUrl) {
          await supabase
            .from('stores')
            .update({
              ...(logoUrl && { logo_url: logoUrl }),
              ...(coverUrl && { cover_url: coverUrl }),
            })
            .eq('id', newStore.id);
        }

        // Clear pending files
        setPendingLogoFile(null);
        setPendingCoverFile(null);

        await refreshStore();
        toast({ title: 'Loja criada com sucesso!', description: 'Aguarde a aprovação para começar a vender.' });
      }
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{store ? 'Minha Loja' : 'Criar Loja'}</h1>
        <p className="text-muted-foreground">
          {store ? 'Gerencie as informações da sua loja.' : 'Configure sua loja para começar a vender.'}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        {/* Cover Image */}
        <div className="relative h-40 md:h-56 rounded-xl overflow-hidden mb-6 bg-muted">
          {coverPreview ? (
            <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary/20 to-secondary/20">
              <span className="text-muted-foreground">Capa da loja</span>
            </div>
          )}
          <label className="absolute bottom-4 right-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
              disabled={uploadingCover}
            />
            <Button type="button" size="sm" variant="secondary" disabled={uploadingCover} asChild>
              <span className="cursor-pointer">
                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploadingCover ? 'Enviando...' : 'Alterar capa'}
              </span>
            </Button>
          </label>
        </div>

        {/* Logo */}
        <div className="flex items-end gap-4 -mt-16 mb-6 ml-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-xl bg-card border-4 border-background overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <Store className="w-10 h-10 text-primary" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploadingLogo}
              />
              <Button type="button" size="icon" variant="secondary" className="rounded-full w-8 h-8" disabled={uploadingLogo} asChild>
                <span className="cursor-pointer">
                  {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                </span>
              </Button>
            </label>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja *</Label>
              <Input id="name" placeholder="Minha Loja" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city_id">Cidade *</Label>
              <Select
                value={form.watch('city_id')}
                onValueChange={(value) => form.setValue('city_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cidade" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}, {city.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.city_id && (
                <p className="text-sm text-destructive">{form.formState.errors.city_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva sua loja..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          {/* Contact */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input id="whatsapp" placeholder="(11) 99999-9999" {...form.register('whatsapp')} />
              {form.formState.errors.whatsapp && (
                <p className="text-sm text-destructive">{form.formState.errors.whatsapp.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="(11) 3333-3333" {...form.register('phone')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="loja@email.com" {...form.register('email')} />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address_street">Rua</Label>
                <Input id="address_street" placeholder="Rua das Flores" {...form.register('address_street')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_number">Número</Label>
                <Input id="address_number" placeholder="123" {...form.register('address_number')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_zipcode">CEP</Label>
                <Input id="address_zipcode" placeholder="00000-000" {...form.register('address_zipcode')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_neighborhood">Bairro</Label>
              <Input id="address_neighborhood" placeholder="Centro" {...form.register('address_neighborhood')} />
            </div>
          </div>

          {/* Shipping */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Configuração de Frete
            </h3>
            <div className="bg-muted/50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="free_shipping">Frete Grátis</Label>
                  <p className="text-sm text-muted-foreground">
                    Ative para oferecer frete grátis para todos os pedidos
                  </p>
                </div>
                <Switch
                  id="free_shipping"
                  checked={form.watch('free_shipping')}
                  onCheckedChange={(checked) => form.setValue('free_shipping', checked)}
                />
              </div>
              
              {!form.watch('free_shipping') && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label htmlFor="shipping_fee">Valor do Frete (R$)</Label>
                  <Input
                    id="shipping_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    {...form.register('shipping_fee')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este valor será aplicado para todos os pedidos da sua cidade
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Personalização Visual
            </h3>
            <div className="bg-muted/50 rounded-xl p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="background_color">Cor de Fundo da Loja</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha uma cor de fundo personalizada para a página da sua loja
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="background_color"
                    value={form.watch('background_color') || '#1a0a2e'}
                    onChange={(e) => form.setValue('background_color', e.target.value)}
                    className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={form.watch('background_color') || ''}
                    onChange={(e) => form.setValue('background_color', e.target.value)}
                    placeholder="#1a0a2e"
                    className="w-32"
                  />
                  {form.watch('background_color') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => form.setValue('background_color', '')}
                    >
                      Resetar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Pulsating Button */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" />
              Botão Pulsante (CTA)
            </h3>
            <div className="bg-muted/50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cta_button_enabled">Ativar Botão Pulsante</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibe um botão chamativo e pulsante no perfil da sua loja
                  </p>
                </div>
                <Switch
                  id="cta_button_enabled"
                  checked={form.watch('cta_button_enabled')}
                  onCheckedChange={(checked) => form.setValue('cta_button_enabled', checked)}
                />
              </div>

              {form.watch('cta_button_enabled') && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="cta_button_title">Título do Botão *</Label>
                    <Input
                      id="cta_button_title"
                      placeholder="Ex: Compre Agora!"
                      {...form.register('cta_button_title')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cta_button_link">Link do Botão *</Label>
                    <Input
                      id="cta_button_link"
                      placeholder="https://exemplo.com"
                      {...form.register('cta_button_link')}
                    />
                    <p className="text-xs text-muted-foreground">
                      O link será aberto em uma nova aba ao clicar no botão
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="button-gradient" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : store ? (
              'Salvar Alterações'
            ) : (
              'Criar Loja'
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
