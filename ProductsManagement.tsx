import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Package, Pencil, Trash2, X, Upload, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  stock: number;
  images: string[] | null;
  status: string;
  category_id: string | null;
  category: { name: string } | null;
}

interface StoreData {
  id: string;
  name: string;
}

interface DashboardContext {
  store: StoreData | null;
}

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  price: z.string().min(1, 'Preço é obrigatório'),
  original_price: z.string().optional(),
  stock: z.string().min(1, 'Estoque é obrigatório'),
  category_id: z.string().optional(),
  status: z.string(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductsManagement() {
  const { store } = useOutletContext<DashboardContext>();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      original_price: '',
      stock: '0',
      category_id: '',
      status: 'active',
    },
  });

  useEffect(() => {
    fetchCategories();
    if (store) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [store]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setCategories((data as Category[]) || []);
  };

  const fetchProducts = async () => {
    if (!store) return;
    
    const { data } = await supabase
      .from('products')
      .select(`*, category:categories(name)`)
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    setProducts((data as unknown as Product[]) || []);
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base}-${Date.now().toString(36)}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !store) return;

    setUploadingImages(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${store.id}/products/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('store-assets')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        toast({ title: 'Erro ao enviar imagem', description: error.message, variant: 'destructive' });
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('store-assets')
          .getPublicUrl(fileName);
        newImages.push(publicUrl);
      }
    }

    setProductImages(prev => [...prev, ...newImages]);
    setUploadingImages(false);
  };

  const removeImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      form.reset({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        original_price: product.original_price?.toString() || '',
        stock: product.stock.toString(),
        category_id: product.category_id || '',
        status: product.status,
      });
      setProductImages(product.images || []);
    } else {
      setEditingProduct(null);
      form.reset({
        name: '',
        description: '',
        price: '',
        original_price: '',
        stock: '0',
        category_id: '',
        status: 'active',
      });
      setProductImages([]);
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setProductImages([]);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!store) return;

    setSaving(true);

    const productData = {
      store_id: store.id,
      name: data.name,
      slug: generateSlug(data.name),
      description: data.description || null,
      price: parseFloat(data.price),
      original_price: data.original_price ? parseFloat(data.original_price) : null,
      stock: parseInt(data.stock),
      category_id: data.category_id || null,
      status: data.status,
      images: productImages,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: 'Erro ao atualizar produto', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Produto atualizado!' });
        fetchProducts();
        closeDialog();
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) {
        toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Produto criado!' });
        fetchProducts();
        closeDialog();
      }
    }

    setSaving(false);
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      toast({ title: 'Erro ao excluir produto', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Produto excluído!' });
      fetchProducts();
    }
  };

  const toggleStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    
    const { error } = await supabase
      .from('products')
      .update({ status: newStatus })
      .eq('id', product.id);

    if (!error) {
      fetchProducts();
      toast({ title: `Produto ${newStatus === 'active' ? 'ativado' : 'desativado'}!` });
    }
  };

  if (!store) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Crie sua loja primeiro</h2>
        <p className="text-muted-foreground">Você precisa criar uma loja para adicionar produtos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gerencie os produtos da sua loja.</p>
        </div>
        <Button onClick={() => openDialog()} className="button-gradient">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando produtos...</div>
      ) : products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 text-center"
        >
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum produto ainda</h2>
          <p className="text-muted-foreground mb-6">Adicione seu primeiro produto para começar a vender.</p>
          <Button onClick={() => openDialog()} className="button-gradient">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Produto
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass rounded-xl p-4"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {product.images && product.images.length > 0 && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold truncate">{product.name}</h3>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs mt-1">{product.category.name}</Badge>
                      )}
                    </div>
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status === 'active' ? 'Ativo' : product.status === 'pending' ? 'Pendente' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="font-semibold text-primary">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-muted-foreground">
                      Estoque: {product.stock}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleStatus(product)}>
                    {product.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(product)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Images */}
            <div className="space-y-2">
              <Label>Imagens</Label>
              <div className="flex flex-wrap gap-2">
                {productImages.map((img, index) => (
                  <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImages}
                  />
                  {uploadingImages ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" placeholder="Nome do produto" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria</Label>
                <Select
                  value={form.watch('category_id')}
                  onValueChange={(value) => form.setValue('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" placeholder="Descreva o produto..." rows={3} {...form.register('description')} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço *</Label>
                <Input id="price" type="number" step="0.01" placeholder="0.00" {...form.register('price')} />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="original_price">Preço Original</Label>
                <Input id="original_price" type="number" step="0.01" placeholder="0.00" {...form.register('original_price')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Estoque *</Label>
                <Input id="stock" type="number" placeholder="0" {...form.register('stock')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="button-gradient" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingProduct ? 'Salvar' : 'Criar Produto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
