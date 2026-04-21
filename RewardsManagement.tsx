import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Gift, Plus, Pencil, Trash2, AlertCircle, Coins } from 'lucide-react';
import { format } from 'date-fns';

interface StoreData {
  id: string;
  name: string;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  type: 'discount' | 'product' | 'coupon';
  points_required: number;
  discount_value: number | null;
  discount_type: string | null;
  is_active: boolean;
  max_redemptions: number | null;
  redemptions_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

const defaultReward = {
  name: '',
  description: '',
  type: 'discount' as 'discount' | 'product' | 'coupon',
  points_required: 100,
  discount_value: 10,
  discount_type: 'percentage',
  is_active: true,
  max_redemptions: null as number | null,
  start_date: '',
  end_date: ''
};

export default function RewardsManagement() {
  const context = useOutletContext<{ store: StoreData }>();
  const store = context?.store;
  
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState(defaultReward);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store?.id) {
      fetchData();
    }
  }, [store?.id]);

  const fetchData = async () => {
    if (!store?.id) return;

    try {
      const { data: rewardsData } = await supabase
        .from('store_rewards')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      setRewards(rewardsData as Reward[] || []);

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('store_id', store.id)
        .eq('status', 'active');

      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        name: reward.name,
        description: reward.description || '',
        type: reward.type,
        points_required: reward.points_required,
        discount_value: reward.discount_value || 10,
        discount_type: reward.discount_type || 'percentage',
        is_active: reward.is_active,
        max_redemptions: reward.max_redemptions,
        start_date: reward.start_date ? format(new Date(reward.start_date), 'yyyy-MM-dd') : '',
        end_date: reward.end_date ? format(new Date(reward.end_date), 'yyyy-MM-dd') : ''
      });
    } else {
      setEditingReward(null);
      setFormData(defaultReward);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (formData.points_required <= 0) {
      toast.error('Pontos necessários deve ser maior que zero');
      return;
    }

    setSaving(true);
    try {
      const data = {
        store_id: store!.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        points_required: formData.points_required,
        discount_value: formData.type === 'discount' || formData.type === 'coupon' ? formData.discount_value : null,
        discount_type: formData.type === 'discount' || formData.type === 'coupon' ? formData.discount_type : null,
        is_active: formData.is_active,
        max_redemptions: formData.max_redemptions || null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
      };

      if (editingReward) {
        const { error } = await supabase
          .from('store_rewards')
          .update(data)
          .eq('id', editingReward.id);

        if (error) throw error;
        toast.success('Recompensa atualizada!');
      } else {
        const { error } = await supabase
          .from('store_rewards')
          .insert(data);

        if (error) throw error;
        toast.success('Recompensa criada!');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving reward:', error);
      toast.error('Erro ao salvar recompensa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta recompensa?')) return;

    try {
      const { error } = await supabase
        .from('store_rewards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Recompensa excluída!');
      fetchData();
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast.error('Erro ao excluir recompensa');
    }
  };

  const toggleActive = async (reward: Reward) => {
    try {
      const { error } = await supabase
        .from('store_rewards')
        .update({ is_active: !reward.is_active })
        .eq('id', reward.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling reward:', error);
      toast.error('Erro ao atualizar recompensa');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'discount': return 'Desconto';
      case 'product': return 'Produto';
      case 'coupon': return 'Cupom';
      default: return type;
    }
  };

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Loja não encontrada</h2>
        <p className="text-muted-foreground">Você precisa criar uma loja primeiro.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recompensas</h1>
          <p className="text-muted-foreground">Crie recompensas para seus clientes resgatarem com pontos</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Recompensa
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {rewards.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma recompensa criada</h3>
              <p className="text-muted-foreground mb-4">Crie recompensas para incentivar seus clientes</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Recompensa
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-right">Resgates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{reward.name}</p>
                        {reward.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{reward.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(reward.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium flex items-center justify-end gap-1">
                        <Coins className="h-4 w-4 text-primary" />
                        {reward.points_required.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {reward.redemptions_count}
                      {reward.max_redemptions && (
                        <span className="text-muted-foreground">/{reward.max_redemptions}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={reward.is_active}
                        onCheckedChange={() => toggleActive(reward)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(reward)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(reward.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reward Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}</DialogTitle>
            <DialogDescription>
              Configure os detalhes da recompensa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: 10% de desconto"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da recompensa..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'discount' | 'product' | 'coupon') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Desconto</SelectItem>
                    <SelectItem value="coupon">Cupom</SelectItem>
                    <SelectItem value="product">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pontos Necessários *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.points_required}
                  onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {(formData.type === 'discount' || formData.type === 'coupon') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
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

                <div className="space-y-2">
                  <Label>Valor do Desconto</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.discount_value || ''}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Limite de Resgates (opcional)</Label>
              <Input
                type="number"
                min="1"
                value={formData.max_redemptions || ''}
                onChange={(e) => setFormData({ ...formData, max_redemptions: parseInt(e.target.value) || null })}
                placeholder="Sem limite"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início (opcional)</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim (opcional)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label>Ativa</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingReward ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
