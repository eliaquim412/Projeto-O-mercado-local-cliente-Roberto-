import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Eye, EyeOff, Ticket, Copy, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StoreData {
  id: string;
  name: string;
  slug: string;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  applies_to: string;
  created_at: string;
}

export default function CouponsManagement() {
  const { store } = useOutletContext<{ store: StoreData | null }>();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase: 0,
    max_discount: '',
    max_uses: '',
    max_uses_per_user: 1,
    start_date: '',
    end_date: '',
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (store) {
      fetchCoupons();
    }
  }, [store]);

  const fetchCoupons = async () => {
    if (!store) return;

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar cupons', variant: 'destructive' });
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  };

  const openDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_purchase: coupon.min_purchase,
        max_discount: coupon.max_discount?.toString() || '',
        max_uses: coupon.max_uses?.toString() || '',
        max_uses_per_user: coupon.max_uses_per_user || 1,
        start_date: coupon.start_date ? coupon.start_date.slice(0, 16) : '',
        end_date: coupon.end_date ? coupon.end_date.slice(0, 16) : '',
        is_active: coupon.is_active,
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase: 0,
        max_discount: '',
        max_uses: '',
        max_uses_per_user: 1,
        start_date: '',
        end_date: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSave = async () => {
    if (!store) return;
    if (!formData.code || !formData.discount_value) {
      toast({ title: 'Preencha código e valor do desconto', variant: 'destructive' });
      return;
    }

    const couponData = {
      store_id: store.id,
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      min_purchase: formData.min_purchase,
      max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      max_uses_per_user: formData.max_uses_per_user,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      is_active: formData.is_active,
    };

    if (editingCoupon) {
      const { error } = await supabase
        .from('coupons')
        .update(couponData)
        .eq('id', editingCoupon.id);

      if (error) {
        toast({ title: 'Erro ao atualizar cupom', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Cupom atualizado com sucesso' });
        setDialogOpen(false);
        fetchCoupons();
      }
    } else {
      const { error } = await supabase
        .from('coupons')
        .insert([couponData]);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Código já existe', description: 'Use outro código', variant: 'destructive' });
        } else {
          toast({ title: 'Erro ao criar cupom', description: error.message, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Cupom criado com sucesso' });
        setDialogOpen(false);
        fetchCoupons();
      }
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } else {
      fetchCoupons();
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir cupom', variant: 'destructive' });
    } else {
      toast({ title: 'Cupom excluído com sucesso' });
      fetchCoupons();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Código copiado!' });
  };

  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date();
    const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
    const endDate = coupon.end_date ? new Date(coupon.end_date) : null;

    if (!coupon.is_active) return { label: 'Inativo', variant: 'secondary' as const };
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) return { label: 'Esgotado', variant: 'destructive' as const };
    if (startDate && startDate > now) return { label: 'Agendado', variant: 'outline' as const };
    if (endDate && endDate < now) return { label: 'Expirado', variant: 'destructive' as const };
    return { label: 'Ativo', variant: 'default' as const };
  };

  if (!store) {
    return (
      <div className="text-center py-12">
        <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Crie sua loja primeiro</h2>
        <p className="text-muted-foreground">Você precisa ter uma loja para gerenciar cupons.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
          <p className="text-muted-foreground">Crie cupons promocionais para sua loja</p>
        </div>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Cupom
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 glass rounded-xl">
          <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum cupom cadastrado</h3>
          <p className="text-muted-foreground mb-4">Crie seu primeiro cupom de desconto.</p>
          <Button onClick={() => openDialog()}>Criar Cupom</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon, index) => {
                const status = getCouponStatus(coupon);
                return (
                  <motion.tr
                    key={coupon.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                          {coupon.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(coupon.code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}%` 
                          : `R$${coupon.discount_value.toFixed(2)}`}
                      </span>
                      {coupon.min_purchase > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Min: R${coupon.min_purchase.toFixed(2)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3 h-3" />
                        {coupon.uses_count}
                        {coupon.max_uses && `/${coupon.max_uses}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {coupon.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            De: {format(new Date(coupon.start_date), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        )}
                        {coupon.end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Até: {format(new Date(coupon.end_date), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        )}
                        {!coupon.start_date && !coupon.end_date && 'Sem limite'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(coupon)}
                          title={coupon.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {coupon.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(coupon)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCoupon(coupon.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código do Cupom *</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="EX: DESCONTO10"
                  className="uppercase"
                />
                <Button variant="outline" onClick={generateCode} type="button">
                  Gerar
                </Button>
              </div>
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Cupom de boas-vindas"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Desconto</Label>
                <Select 
                  value={formData.discount_type}
                  onValueChange={(value) => setFormData({ ...formData, discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do Desconto *</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Compra Mínima (R$)</Label>
                <Input
                  type="number"
                  value={formData.min_purchase}
                  onChange={(e) => setFormData({ ...formData, min_purchase: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              {formData.discount_type === 'percentage' && (
                <div>
                  <Label>Desconto Máximo (R$)</Label>
                  <Input
                    type="number"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    placeholder="Sem limite"
                    min={0}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Limite de Usos Total</Label>
                <Input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Ilimitado"
                  min={0}
                />
              </div>
              <div>
                <Label>Usos por Cliente</Label>
                <Input
                  type="number"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active">Cupom ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCoupon ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}