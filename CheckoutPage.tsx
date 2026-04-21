import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShoppingBag, Minus, Plus, Trash2, MessageCircle, Loader2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import CouponInput from '@/components/store/CouponInput';
import RewardsSelector from '@/components/checkout/RewardsSelector';

interface AppliedCoupon {
  couponId: string;
  code: string;
  discount: number;
  description?: string;
}

interface AppliedReward {
  rewardId: string;
  name: string;
  discount: number;
  pointsUsed: number;
}

export default function CheckoutPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { getStoreItems, getStoreTotal, updateQuantity, removeItem, clearStoreItems } = useCart();
  
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [appliedReward, setAppliedReward] = useState<AppliedReward | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    notes: ''
  });

  const items = storeId ? getStoreItems(storeId) : [];
  const subtotal = storeId ? getStoreTotal(storeId) : 0;
  const couponDiscount = appliedCoupon?.discount || 0;
  const rewardDiscount = appliedReward?.discount || 0;
  const totalDiscount = couponDiscount + rewardDiscount;
  
  // Calculate shipping
  const shippingFee = store?.free_shipping ? 0 : (store?.shipping_fee || 0);
  const total = subtotal - totalDiscount + shippingFee;

  useEffect(() => {
    if (storeId) {
      fetchStore();
      loadUserProfile();
    }
  }, [storeId, user]);

  const fetchStore = async () => {
    const { data } = await supabase
      .from('stores')
      .select('*, city:cities(name, state), points_program_enabled')
      .eq('id', storeId)
      .single();
    
    setStore(data);
    setLoading(false);
  };

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, cpf')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setFormData(prev => ({
        ...prev,
        name: data.full_name || '',
        phone: data.phone || '',
        email: user.email || '',
        cpf: data.cpf || ''
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generateWhatsAppMessage = () => {
    let message = `🛒 *Novo Pedido*\n\n`;
    message += `*Cliente:* ${formData.name}\n`;
    message += `*Telefone:* ${formData.phone}\n`;
    if (formData.email) message += `*Email:* ${formData.email}\n`;
    message += `\n*Itens do Pedido:*\n`;
    
    items.forEach(item => {
      message += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    
    message += `\n*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    
    if (appliedCoupon) {
      message += `\n*Cupom (${appliedCoupon.code}):* -R$ ${couponDiscount.toFixed(2).replace('.', ',')}`;
    }

    if (appliedReward) {
      message += `\n*Recompensa (${appliedReward.name}):* -R$ ${rewardDiscount.toFixed(2).replace('.', ',')}`;
    }

    if (store?.free_shipping) {
      message += `\n*Frete:* Grátis`;
    } else if (shippingFee > 0) {
      message += `\n*Frete:* R$ ${shippingFee.toFixed(2).replace('.', ',')}`;
    }
    
    message += `\n*Total:* R$ ${total.toFixed(2).replace('.', ',')}`;
    
    if (formData.notes) {
      message += `\n\n*Observações:* ${formData.notes}`;
    }
    
    return encodeURIComponent(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Orders are linked to the logged-in user so they can appear in "Meus Pedidos"
    if (!user) {
      const redirect = storeId ? `/checkout/${storeId}` : '/';
      toast.error('Faça login para finalizar e acompanhar seu pedido');
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Preencha nome e telefone');
      return;
    }

    if (formData.name.length > 100 || formData.phone.length > 20) {
      toast.error('Dados inválidos');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Save CPF to profile if provided
      if (user && formData.cpf) {
        const cpfDigits = formData.cpf.replace(/\D/g, '');
        if (cpfDigits.length === 11) {
          await supabase
            .from('profiles')
            .update({ cpf: cpfDigits })
            .eq('id', user.id);
        }
      }

      // Save order to database
      const orderItems = items.map(item => ({
        product_id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      }));

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          store_id: storeId,
          customer_id: user?.id || null,
          customer_name: formData.name.trim().substring(0, 100),
          customer_phone: formData.phone.trim().substring(0, 20),
          customer_email: formData.email.trim().substring(0, 255) || null,
          items: orderItems,
          subtotal,
          shipping_cost: shippingFee,
          total,
          notes: formData.notes.trim().substring(0, 500) || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      if (appliedCoupon && user) {
        await supabase.from('coupon_uses').insert({
          coupon_id: appliedCoupon.couponId,
          user_id: user.id,
          order_id: order.id,
          discount_applied: couponDiscount
        });

        // Increment coupon uses_count
        await supabase.rpc('validate_coupon', {
          p_code: appliedCoupon.code,
          p_store_id: storeId,
          p_user_id: user.id,
          p_cart_total: subtotal
        });
      }

      // Process reward redemption if applied
      if (appliedReward && user && storeId) {
        try {
          // Create points transaction for redemption
          await supabase.from('points_transactions').insert({
            customer_id: user.id,
            store_id: storeId,
            order_id: order.id,
            points: appliedReward.pointsUsed,
            type: 'redeem',
            reward_id: appliedReward.rewardId,
            description: `Resgate: ${appliedReward.name}`
          });
        } catch (rewardError) {
          console.error('Error processing reward redemption:', rewardError);
        }
      }

      // Award points if program is active, store has points enabled, user is logged in, and user has CPF
      if (user && storeId && store?.points_program_enabled !== false) {
        try {
          // Check if user has CPF registered
          const { data: profileData } = await supabase
            .from('profiles')
            .select('cpf')
            .eq('id', user.id)
            .maybeSingle();

          if (!profileData?.cpf) {
            toast.info('Cadastre seu CPF no perfil para acumular pontos nas próximas compras!');
          } else {
            const { data: pointsSettings } = await supabase
              .from('points_settings')
              .select('*')
              .eq('is_active', true)
              .maybeSingle();

            if (pointsSettings && total >= pointsSettings.min_purchase_for_points) {
              const pointsEarned = Math.floor(total * pointsSettings.points_per_currency);
              
              if (pointsEarned > 0) {
                await supabase.from('points_transactions').insert({
                  customer_id: user.id,
                  store_id: storeId,
                  order_id: order.id,
                  points: pointsEarned,
                  type: 'earn',
                  description: `Compra no valor de R$ ${total.toFixed(2)}`
                });
                
                toast.success(`Você ganhou ${pointsEarned} pontos!`);
              }
            }
          }
        } catch (pointsError) {
          console.error('Error awarding points:', pointsError);
        }
      }

      // Open WhatsApp
      const whatsappNumber = store?.whatsapp?.replace(/\D/g, '') || '';
      const message = generateWhatsAppMessage();
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      
      window.open(whatsappUrl, '_blank');
      
      // Clear cart items for this store
      clearStoreItems(storeId!);
      
      toast.success('Pedido enviado com sucesso!');
      navigate('/meus-pedidos');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store || items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Carrinho vazio</h1>
        <p className="text-muted-foreground mb-4">Adicione produtos para continuar</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Início
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Finalizar Pedido</h1>
            <p className="text-sm text-muted-foreground">{store.name}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-primary font-semibold text-sm">
                      R$ {item.price.toFixed(2).replace('.', ',')}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              ))}

              <Separator />

              <CouponInput
                storeId={storeId!}
                cartTotal={subtotal}
                onCouponApplied={setAppliedCoupon}
                onCouponRemoved={() => setAppliedCoupon(null)}
                appliedCoupon={appliedCoupon}
              />

              <Separator />

              <RewardsSelector
                storeId={storeId!}
                userId={user?.id}
                cartTotal={subtotal}
                onRewardApplied={setAppliedReward}
                appliedReward={appliedReward}
              />

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Cupom ({appliedCoupon.code})</span>
                    <span>-R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {appliedReward && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Recompensa ({appliedReward.name})</span>
                    <span>-R$ {rewardDiscount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    Frete
                  </span>
                  {store?.free_shipping ? (
                    <span className="text-green-600 font-medium">Grátis</span>
                  ) : shippingFee > 0 ? (
                    <span>R$ {shippingFee.toFixed(2).replace('.', ',')}</span>
                  ) : (
                    <span className="text-muted-foreground">A combinar</span>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seus Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Seu nome completo"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    required
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF (para programa de pontos)</Label>
                  <Input
                    id="cpf"
                    name="cpf"
                    value={formData.cpf}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').substring(0, 11);
                      let formatted = digits;
                      if (digits.length > 3) formatted = `${digits.slice(0,3)}.${digits.slice(3)}`;
                      if (digits.length > 6) formatted = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
                      if (digits.length > 9) formatted = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
                      setFormData(prev => ({ ...prev, cpf: formatted }));
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Informações adicionais sobre o pedido..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={submitting || authLoading || !user || !store.whatsapp}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4 mr-2" />
                  )}
                  Enviar Pedido via WhatsApp
                </Button>

                {!user && (
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Faça login para salvar o pedido e ver em “Meus Pedidos”.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const redirect = storeId ? `/checkout/${storeId}` : '/';
                        navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
                      }}
                    >
                      Entrar / Criar conta
                    </Button>
                  </div>
                )}

                {!store.whatsapp && (
                  <p className="text-sm text-destructive text-center">
                    Esta loja não possui WhatsApp configurado
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
