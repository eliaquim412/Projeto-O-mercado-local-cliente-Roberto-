import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Store, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';

type AuthMode = 'login' | 'register';
type UserType = 'consumer' | 'merchant';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const consumerRegisterSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

const merchantRegisterSchema = z.object({
  business_name: z.string().min(2, 'Nome fantasia deve ter pelo menos 2 caracteres'),
  document: z.string().min(11, 'CPF/CNPJ inválido'),
  full_name: z.string().min(2, 'Nome do responsável deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type ConsumerFormData = z.infer<typeof consumerRegisterSchema>;
type MerchantFormData = z.infer<typeof merchantRegisterSchema>;

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [userType, setUserType] = useState<UserType>('consumer');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (() => {
    const raw = new URLSearchParams(location.search).get('redirect');
    // prevent open-redirects
    return raw && raw.startsWith('/') ? raw : '/';
  })();

  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const consumerForm = useForm<ConsumerFormData>({
    resolver: zodResolver(consumerRegisterSchema),
  });

  const merchantForm = useForm<MerchantFormData>({
    resolver: zodResolver(merchantRegisterSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });

      // Check user role and redirect accordingly
      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      if (loggedUser) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', loggedUser.id);

        const roleList = (roles || []).map(r => r.role);

        if (roleList.includes('admin')) {
          navigate('/admin');
          return;
        }
        if (roleList.includes('municipal_admin')) {
          navigate('/prefeitura');
          return;
        }
      }

      navigate(redirectTo);
    }
  };

  const handleConsumerRegister = async (data: ConsumerFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, {
      full_name: data.full_name,
      phone: data.phone,
      user_type: 'consumer',
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message === 'User already registered'
          ? 'Este email já está cadastrado'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Você já pode começar a usar o marketplace.',
      });
      navigate(redirectTo);
    }
  };

  const handleMerchantRegister = async (data: MerchantFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, {
      full_name: data.full_name,
      phone: data.phone,
      user_type: 'merchant',
      business_name: data.business_name,
      document: data.document,
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message === 'User already registered'
          ? 'Este email já está cadastrado'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Loja criada!',
        description: 'Agora escolha um plano para sua loja.',
      });
      navigate('/dashboard/planos');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back to home */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para início
        </Button>

        <div className="glass rounded-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Logo" className="h-10" />
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === 'login' ? 'default' : 'outline'}
              onClick={() => setMode('login')}
              className={`flex-1 ${mode === 'login' ? 'button-gradient' : ''}`}
            >
              Entrar
            </Button>
            <Button
              variant={mode === 'register' ? 'default' : 'outline'}
              onClick={() => setMode('register')}
              className={`flex-1 ${mode === 'register' ? 'button-gradient' : ''}`}
            >
              Cadastrar
            </Button>
          </div>

          {/* User Type Toggle (only for register) */}
          {mode === 'register' && (
            <div className="flex gap-2 mb-6">
              <Button
                variant="outline"
                onClick={() => setUserType('consumer')}
                className={`flex-1 ${userType === 'consumer' ? 'border-primary bg-primary/10' : ''}`}
              >
                <User className="w-4 h-4 mr-2" />
                Comprador
              </Button>
              <Button
                variant="outline"
                onClick={() => setUserType('merchant')}
                className={`flex-1 ${userType === 'merchant' ? 'border-primary bg-primary/10' : ''}`}
              >
                <Store className="w-4 h-4 mr-2" />
                Lojista
              </Button>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...loginForm.register('email')}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...loginForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full button-gradient" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          )}

          {/* Consumer Register Form */}
          {mode === 'register' && userType === 'consumer' && (
            <form onSubmit={consumerForm.handleSubmit(handleConsumerRegister)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  placeholder="Seu nome"
                  {...consumerForm.register('full_name')}
                />
                {consumerForm.formState.errors.full_name && (
                  <p className="text-sm text-destructive">{consumerForm.formState.errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...consumerForm.register('email')}
                />
                {consumerForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{consumerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...consumerForm.register('phone')}
                />
                {consumerForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{consumerForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...consumerForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {consumerForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{consumerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...consumerForm.register('confirmPassword')}
                />
                {consumerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{consumerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full button-gradient" disabled={isLoading}>
                {isLoading ? 'Cadastrando...' : 'Criar conta'}
              </Button>
            </form>
          )}

          {/* Merchant Register Form */}
          {mode === 'register' && userType === 'merchant' && (
            <form onSubmit={merchantForm.handleSubmit(handleMerchantRegister)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Nome Fantasia</Label>
                <Input
                  id="business_name"
                  placeholder="Nome da sua loja"
                  {...merchantForm.register('business_name')}
                />
                {merchantForm.formState.errors.business_name && (
                  <p className="text-sm text-destructive">{merchantForm.formState.errors.business_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CPF/CNPJ</Label>
                <Input
                  id="document"
                  placeholder="000.000.000-00"
                  {...merchantForm.register('document')}
                />
                {merchantForm.formState.errors.document && (
                  <p className="text-sm text-destructive">{merchantForm.formState.errors.document.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nome do Responsável</Label>
                <Input
                  id="full_name"
                  placeholder="Seu nome"
                  {...merchantForm.register('full_name')}
                />
                {merchantForm.formState.errors.full_name && (
                  <p className="text-sm text-destructive">{merchantForm.formState.errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="loja@email.com"
                  {...merchantForm.register('email')}
                />
                {merchantForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{merchantForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...merchantForm.register('phone')}
                />
                {merchantForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{merchantForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...merchantForm.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {merchantForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{merchantForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...merchantForm.register('confirmPassword')}
                />
                {merchantForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{merchantForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full button-gradient" disabled={isLoading}>
                {isLoading ? 'Cadastrando...' : 'Criar loja'}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
