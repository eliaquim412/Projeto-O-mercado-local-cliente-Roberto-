import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Coins, Settings, TrendingUp, Users } from 'lucide-react';

interface PointsSettings {
  id: string;
  points_per_currency: number;
  min_purchase_for_points: number;
  is_active: boolean;
}

interface Stats {
  totalCustomers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  activeStores: number;
}

export default function AdminPointsSettings() {
  const [settings, setSettings] = useState<PointsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalCustomers: 0, totalPointsIssued: 0, totalPointsRedeemed: 0, activeStores: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('points_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settingsData) {
        setSettings(settingsData);
      }

      // Fetch stats
      const { data: pointsData } = await supabase
        .from('customer_points')
        .select('balance, total_earned, total_redeemed');

      const { data: storesData } = await supabase
        .from('store_rewards')
        .select('store_id')
        .eq('is_active', true);

      const uniqueStores = new Set(storesData?.map(s => s.store_id) || []);

      setStats({
        totalCustomers: pointsData?.length || 0,
        totalPointsIssued: pointsData?.reduce((sum, p) => sum + (p.total_earned || 0), 0) || 0,
        totalPointsRedeemed: pointsData?.reduce((sum, p) => sum + (p.total_redeemed || 0), 0) || 0,
        activeStores: uniqueStores.size
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('points_settings')
        .update({
          points_per_currency: settings.points_per_currency,
          min_purchase_for_points: settings.min_purchase_for_points,
          is_active: settings.is_active
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programa de Pontos</h1>
        <p className="text-muted-foreground">Configure o sistema de fidelidade da plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                <p className="text-sm text-muted-foreground">Clientes no Programa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <Coins className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPointsIssued.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pontos Emitidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <TrendingUp className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPointsRedeemed.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pontos Resgatados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Settings className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeStores}</p>
                <p className="text-sm text-muted-foreground">Lojas com Recompensas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Configurações do Programa
          </CardTitle>
          <CardDescription>
            Defina como os pontos serão calculados para todas as lojas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings && (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base">Programa Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando desativado, nenhum ponto será gerado nas compras
                  </p>
                </div>
                <Switch
                  checked={settings.is_active}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="points_per_currency">Pontos por R$ 1,00</Label>
                  <Input
                    id="points_per_currency"
                    type="number"
                    min="1"
                    step="1"
                    value={settings.points_per_currency}
                    onChange={(e) => setSettings({ ...settings, points_per_currency: Number(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Ex: Se definir 10, a cada R$ 1,00 gasto o cliente ganha 10 pontos
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_purchase">Valor Mínimo para Ganhar Pontos (R$)</Label>
                  <Input
                    id="min_purchase"
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.min_purchase_for_points}
                    onChange={(e) => setSettings({ ...settings, min_purchase_for_points: Number(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Compras abaixo deste valor não geram pontos (0 = sem mínimo)
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Exemplo de Cálculo</h4>
                <p className="text-sm text-muted-foreground">
                  Uma compra de <span className="text-foreground font-medium">R$ 100,00</span> gera{' '}
                  <span className="text-primary font-medium">{(100 * settings.points_per_currency).toLocaleString()} pontos</span>
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Configurações
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
