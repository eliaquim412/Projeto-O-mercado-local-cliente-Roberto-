import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, User, MapPin, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CpfInput from '@/components/profile/CpfInput';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  phone: z.string().min(10, 'Telefone inválido').max(20).optional().or(z.literal('')),
  cpf: z.string().optional().or(z.literal('')),
});

const addressSchema = z.object({
  address_zipcode: z.string().max(10).optional().or(z.literal('')),
  address_street: z.string().max(200).optional().or(z.literal('')),
  address_number: z.string().max(20).optional().or(z.literal('')),
  address_complement: z.string().max(100).optional().or(z.literal('')),
  address_neighborhood: z.string().max(100).optional().or(z.literal('')),
  address_city: z.string().max(100).optional().or(z.literal('')),
  address_state: z.string().max(2).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type AddressFormData = z.infer<typeof addressSchema>;

interface ProfileData {
  full_name: string;
  phone: string | null;
  cpf: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      cpf: '',
    },
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address_zipcode: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone, cpf, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zipcode')
      .eq('id', user?.id)
      .single();

    if (data) {
      profileForm.reset({
        full_name: data.full_name || '',
        phone: data.phone || '',
        cpf: data.cpf || '',
      });
      addressForm.reset({
        address_zipcode: data.address_zipcode || '',
        address_street: data.address_street || '',
        address_number: data.address_number || '',
        address_complement: data.address_complement || '',
        address_neighborhood: data.address_neighborhood || '',
        address_city: data.address_city || '',
        address_state: data.address_state || '',
      });
    }
    setLoading(false);
  };

  const handleProfileSubmit = async (data: ProfileFormData) => {
    setSavingProfile(true);
    // Store CPF without formatting (only digits) for consistent searching
    const cpfDigits = data.cpf ? data.cpf.replace(/\D/g, '') : null;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone || null,
        cpf: cpfDigits,
      })
      .eq('id', user?.id);

    setSavingProfile(false);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seus dados.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Dados atualizados!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    }
  };

  const handleAddressSubmit = async (data: AddressFormData) => {
    setSavingAddress(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        address_zipcode: data.address_zipcode || null,
        address_street: data.address_street || null,
        address_number: data.address_number || null,
        address_complement: data.address_complement || null,
        address_neighborhood: data.address_neighborhood || null,
        address_city: data.address_city || null,
        address_state: data.address_state || null,
      })
      .eq('id', user?.id);

    setSavingAddress(false);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar seu endereço.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Endereço atualizado!',
        description: 'Seu endereço foi salvo com sucesso.',
      });
    }
  };

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        addressForm.setValue('address_street', data.logradouro || '');
        addressForm.setValue('address_neighborhood', data.bairro || '');
        addressForm.setValue('address_city', data.localidade || '');
        addressForm.setValue('address_state', data.uf || '');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
    setFetchingCep(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Meu Perfil</h1>
              <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Dados Pessoais
              </TabsTrigger>
              <TabsTrigger value="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço
              </TabsTrigger>
            </TabsList>

            {/* Personal Data Tab */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Pessoais</CardTitle>
                  <CardDescription>
                    Atualize suas informações de contato
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome completo *</Label>
                      <Input
                        id="full_name"
                        placeholder="Seu nome completo"
                        {...profileForm.register('full_name')}
                      />
                      {profileForm.formState.errors.full_name && (
                        <p className="text-sm text-destructive">
                          {profileForm.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        O email não pode ser alterado
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="(11) 99999-9999"
                        {...profileForm.register('phone')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <CpfInput
                        value={profileForm.watch('cpf') || ''}
                        onChange={(value) => profileForm.setValue('cpf', value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Necessário para acumular pontos
                      </p>
                    </div>

                    <Button type="submit" className="w-full button-gradient" disabled={savingProfile}>
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Dados
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address">
              <Card>
                <CardHeader>
                  <CardTitle>Endereço de Entrega</CardTitle>
                  <CardDescription>
                    Adicione seu endereço para facilitar suas compras
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address_zipcode">CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="address_zipcode"
                          placeholder="00000-000"
                          {...addressForm.register('address_zipcode')}
                          onBlur={(e) => handleCepSearch(e.target.value)}
                        />
                        {fetchingCep && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground self-center" />}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_street">Rua</Label>
                      <Input
                        id="address_street"
                        placeholder="Nome da rua"
                        {...addressForm.register('address_street')}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address_number">Número</Label>
                        <Input
                          id="address_number"
                          placeholder="123"
                          {...addressForm.register('address_number')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address_complement">Complemento</Label>
                        <Input
                          id="address_complement"
                          placeholder="Apto 101"
                          {...addressForm.register('address_complement')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_neighborhood">Bairro</Label>
                      <Input
                        id="address_neighborhood"
                        placeholder="Nome do bairro"
                        {...addressForm.register('address_neighborhood')}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="address_city">Cidade</Label>
                        <Input
                          id="address_city"
                          placeholder="Sua cidade"
                          {...addressForm.register('address_city')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address_state">UF</Label>
                        <Input
                          id="address_state"
                          placeholder="SP"
                          maxLength={2}
                          {...addressForm.register('address_state')}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full button-gradient" disabled={savingAddress}>
                      {savingAddress ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Endereço
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
