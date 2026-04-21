import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Users, Store, Package, ShoppingCart, Calendar, TrendingUp, DollarSign, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  store_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  total: number;
  subtotal: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  store?: { id: string; name: string; slug: string };
  customer?: { id: string; full_name: string; phone: string | null };
}

interface StoreSales {
  store_id: string;
  store_name: string;
  store_slug: string;
  total_orders: number;
  total_revenue: number;
  products_sold: number;
}

interface ProductSales {
  product_id: string;
  product_name: string;
  store_name: string;
  quantity_sold: number;
  total_revenue: number;
}

interface CustomerPurchases {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  total_orders: number;
  total_spent: number;
}

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  newUsers: number;
  newStores: number;
  orders: Order[];
  storesSales: StoreSales[];
  productsSales: ProductSales[];
  customerPurchases: CustomerPurchases[];
}

export default function AdminReports() {
  const { toast } = useToast();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: new Date(now.getFullYear(), 0, 1), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'Última Semana';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
      default: return 'Período';
    }
  };

  const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  const fetchReportData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const [ordersRes, usersRes, storesRes, storesListRes, profilesRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr),
      supabase
        .from('stores')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr),
      supabase
        .from('stores')
        .select('id, name, slug'),
      supabase
        .from('profiles')
        .select('id, full_name, phone'),
    ]);

    if (ordersRes.error) {
      toast({
        title: 'Erro ao carregar relatórios',
        description: ordersRes.error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const stores = new Map((storesListRes.data || []).map(s => [s.id, s]));
    const profiles = new Map((profilesRes.data || []).map(p => [p.id, p]));

    const orders: Order[] = (ordersRes.data || []).map((o: any) => ({
      ...o,
      items: Array.isArray(o.items) ? o.items : [],
      store: stores.get(o.store_id),
      customer: o.customer_id ? profiles.get(o.customer_id) : null,
    }));

    // Calculate store sales
    const storesSalesMap = new Map<string, StoreSales>();
    orders.forEach(order => {
      const store = stores.get(order.store_id);
      if (!store) return;
      
      const existing = storesSalesMap.get(order.store_id) || {
        store_id: order.store_id,
        store_name: store.name,
        store_slug: store.slug,
        total_orders: 0,
        total_revenue: 0,
        products_sold: 0,
      };
      
      existing.total_orders += 1;
      existing.total_revenue += order.total;
      existing.products_sold += order.items.reduce((sum, item) => sum + item.quantity, 0);
      storesSalesMap.set(order.store_id, existing);
    });

    // Calculate product sales
    const productsSalesMap = new Map<string, ProductSales>();
    orders.forEach(order => {
      const store = stores.get(order.store_id);
      order.items.forEach(item => {
        const key = `${item.product_id}-${order.store_id}`;
        const existing = productsSalesMap.get(key) || {
          product_id: item.product_id,
          product_name: item.name,
          store_name: store?.name || 'Loja desconhecida',
          quantity_sold: 0,
          total_revenue: 0,
        };
        
        existing.quantity_sold += item.quantity;
        existing.total_revenue += item.price * item.quantity;
        productsSalesMap.set(key, existing);
      });
    });

    // Calculate customer purchases
    const customerPurchasesMap = new Map<string, CustomerPurchases>();
    orders.forEach(order => {
      const customerId = order.customer_id || order.customer_phone;
      const existing = customerPurchasesMap.get(customerId) || {
        customer_id: order.customer_id || '',
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        total_orders: 0,
        total_spent: 0,
      };
      
      existing.total_orders += 1;
      existing.total_spent += order.total;
      customerPurchasesMap.set(customerId, existing);
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    setData({
      totalOrders: orders.length,
      totalRevenue,
      newUsers: usersRes.count || 0,
      newStores: storesRes.count || 0,
      orders,
      storesSales: Array.from(storesSalesMap.values()).sort((a, b) => b.total_revenue - a.total_revenue),
      productsSales: Array.from(productsSalesMap.values()).sort((a, b) => b.quantity_sold - a.quantity_sold),
      customerPurchases: Array.from(customerPurchasesMap.values()).sort((a, b) => b.total_spent - a.total_spent),
    });
    setLoading(false);
  };

  const exportPDF = async () => {
    if (!data) return;
    setExportingPdf(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const primaryColor: [number, number, number] = [249, 115, 22]; // Orange primary color
      const headerColor: [number, number, number] = [30, 30, 30];
      
      // Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Vendas', 14, 22);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${getPeriodLabel()}`, 14, 32);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth - 14, 32, { align: 'right' });

      let yPos = 55;

      // Summary Cards
      doc.setTextColor(...headerColor);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo do Período', 14, yPos);
      yPos += 10;

      const summaryData = [
        ['Total de Vendas', data.totalOrders.toString()],
        ['Receita Total', formatPrice(data.totalRevenue)],
        ['Novos Usuários', data.newUsers.toString()],
        ['Novas Lojas', data.newStores.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Stores Sales Table
      if (data.storesSales.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Vendas por Loja', 14, yPos);
        yPos += 10;

        const storesData = data.storesSales.map(s => [
          s.store_name,
          s.total_orders.toString(),
          s.products_sold.toString(),
          formatPrice(s.total_revenue),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Loja', 'Pedidos', 'Produtos Vendidos', 'Receita']],
          body: storesData,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Check if need new page
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      // Products Sales Table
      if (data.productsSales.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Produtos Mais Vendidos', 14, yPos);
        yPos += 10;

        const productsData = data.productsSales.slice(0, 15).map(p => [
          p.product_name.substring(0, 40),
          p.store_name.substring(0, 20),
          p.quantity_sold.toString(),
          formatPrice(p.total_revenue),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Produto', 'Loja', 'Qtd Vendida', 'Receita']],
          body: productsData,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Check if need new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      // Customer Purchases Table
      if (data.customerPurchases.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Clientes que Compraram', 14, yPos);
        yPos += 10;

        const customersData = data.customerPurchases.slice(0, 20).map(c => [
          c.customer_name.substring(0, 30),
          c.customer_phone,
          c.total_orders.toString(),
          formatPrice(c.total_spent),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Cliente', 'Telefone', 'Pedidos', 'Total Gasto']],
          body: customersData,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Check if need new page
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }

      // Recent Orders Table
      if (data.orders.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Pedidos Recentes', 14, yPos);
        yPos += 10;

        const ordersData = data.orders.slice(0, 20).map(o => [
          `#${o.id.slice(0, 8).toUpperCase()}`,
          o.store?.name?.substring(0, 15) || 'N/A',
          o.customer_name.substring(0, 20),
          format(new Date(o.created_at), 'dd/MM/yyyy', { locale: ptBR }),
          o.status === 'pending' ? 'Pendente' : o.status === 'confirmed' ? 'Confirmado' : o.status,
          formatPrice(o.total),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Pedido', 'Loja', 'Cliente', 'Data', 'Status', 'Total']],
          body: ordersData,
          theme: 'striped',
          headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${pageCount} • Relatório gerado automaticamente pelo Marketplace`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `relatorio_vendas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
      doc.save(fileName);

      toast({ title: 'Relatório exportado!', description: fileName });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Erro ao exportar PDF',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }

    setExportingPdf(false);
  };

  const stats = data ? [
    { label: 'Total de Vendas', value: data.totalOrders, icon: ShoppingCart, color: 'text-green-500' },
    { label: 'Receita Total', value: formatPrice(data.totalRevenue), icon: DollarSign, color: 'text-primary' },
    { label: 'Novos Usuários', value: data.newUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Novas Lojas', value: data.newStores, icon: Store, color: 'text-purple-500' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho do marketplace.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportPDF} disabled={exportingPdf || loading || !data}>
            {exportingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Baixar PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Carregando relatórios...
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tabs with detailed data */}
          <Tabs defaultValue="stores" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stores">Lojas</TabsTrigger>
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="customers">Clientes</TabsTrigger>
              <TabsTrigger value="orders">Pedidos</TabsTrigger>
            </TabsList>

            {/* Stores Tab */}
            <TabsContent value="stores">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Vendas por Loja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.storesSales.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhuma venda no período</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Loja</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Pedidos</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Produtos Vendidos</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Receita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.storesSales.map((store, index) => (
                            <tr key={store.store_id} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {index === 0 && <Badge className="bg-yellow-500">🥇</Badge>}
                                  {index === 1 && <Badge className="bg-gray-400">🥈</Badge>}
                                  {index === 2 && <Badge className="bg-amber-600">🥉</Badge>}
                                  <span className="font-medium">{store.store_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">{store.total_orders}</td>
                              <td className="py-3 px-4 text-center">{store.products_sold}</td>
                              <td className="py-3 px-4 text-right font-semibold text-primary">
                                {formatPrice(store.total_revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Produtos Mais Vendidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.productsSales.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum produto vendido no período</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Produto</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Loja</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Qtd Vendida</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Receita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.productsSales.map((product, index) => (
                            <tr key={`${product.product_id}-${index}`} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {index === 0 && <Badge className="bg-yellow-500">🥇</Badge>}
                                  {index === 1 && <Badge className="bg-gray-400">🥈</Badge>}
                                  {index === 2 && <Badge className="bg-amber-600">🥉</Badge>}
                                  <span className="font-medium">{product.product_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{product.store_name}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant="secondary">{product.quantity_sold}</Badge>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-primary">
                                {formatPrice(product.total_revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Clientes que Compraram
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.customerPurchases.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum cliente no período</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Telefone</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Pedidos</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Gasto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.customerPurchases.map((customer, index) => (
                            <tr key={customer.customer_id || customer.customer_phone} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {index === 0 && <Badge className="bg-yellow-500">🥇</Badge>}
                                  {index === 1 && <Badge className="bg-gray-400">🥈</Badge>}
                                  {index === 2 && <Badge className="bg-amber-600">🥉</Badge>}
                                  <span className="font-medium">{customer.customer_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{customer.customer_phone}</td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant="secondary">{customer.total_orders}</Badge>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-primary">
                                {formatPrice(customer.total_spent)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Pedidos Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.orders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum pedido no período</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pedido</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Loja</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.orders.map((order) => (
                            <tr key={order.id} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-3 px-4 font-mono text-sm">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </td>
                              <td className="py-3 px-4">{order.store?.name || 'N/A'}</td>
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium">{order.customer_name}</p>
                                  <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant={
                                  order.status === 'confirmed' ? 'default' :
                                  order.status === 'pending' ? 'secondary' :
                                  order.status === 'cancelled' ? 'destructive' : 'outline'
                                }>
                                  {order.status === 'pending' ? 'Pendente' :
                                   order.status === 'confirmed' ? 'Confirmado' :
                                   order.status === 'cancelled' ? 'Cancelado' : order.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-primary">
                                {formatPrice(order.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
