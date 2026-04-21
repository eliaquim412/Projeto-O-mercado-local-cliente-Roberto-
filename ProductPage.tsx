import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  Heart, 
  Share2, 
  Truck, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  MapPin,
  ThumbsUp,
  ChevronDown,
  X,
  ZoomIn,
  Minus,
  Plus,
  ShoppingCart,
  CreditCard,
  Check,
  Package,
  Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ReviewForm from "@/components/store/ReviewForm";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  images: string[] | null;
  stock: number;
  review_average: number;
  review_count: number;
  sales_count: number;
  is_featured: boolean;
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    rating_average: number;
    rating_count: number;
    whatsapp: string | null;
    address_neighborhood: string | null;
    city: { name: string; state: string } | null;
    shipping_fee: number | null;
    free_shipping: boolean | null;
  };
  category: { id: string; name: string; slug: string } | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[] | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  user_id: string;
  profile: { full_name: string; avatar_url: string | null } | null;
}

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showAllDescription, setShowAllDescription] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
    }
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('products')
      .select(`
        *,
        store:stores!inner(
          id, name, slug, logo_url, rating_average, rating_count, whatsapp, address_neighborhood,
          city:cities(name, state),
          shipping_fee, free_shipping
        ),
        category:categories(id, name, slug)
      `)
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (fetchError) {
      setError('Erro ao carregar produto');
      setLoading(false);
      return;
    }

    if (!data) {
      setError('Produto não encontrado');
      setLoading(false);
      return;
    }

    setProduct(data as unknown as Product);
    setLoading(false);
  };

  const fetchReviews = async () => {
    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsData && reviewsData.length > 0) {
      // Fetch profiles for all review users
      const userIds = reviewsData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Map profiles to reviews
      const reviewsWithProfiles = reviewsData.map(review => ({
        ...review,
        profile: profilesData?.find(p => p.id === review.user_id) || null
      }));

      setReviews(reviewsWithProfiles as unknown as Review[]);
      
      // Check if current user has already reviewed
      if (user) {
        const existingReview = reviewsWithProfiles.find(r => r.user_id === user.id);
        setUserReview(existingReview as Review || null);
      }
    } else {
      setReviews([]);
      setUserReview(null);
    }
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    fetchReviews();
    fetchProduct(); // Refresh product to get updated review stats
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calculateDiscount = (price: number, originalPrice: number) => {
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const images = product?.images?.length ? product.images : ['/placeholder.svg'];

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    setAddingToCart(true);
    try {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.original_price,
        image: images[0],
        storeId: product.store.id,
        storeName: product.store.name,
        storeWhatsapp: product.store.whatsapp,
      }, quantity);
      toast.success('Produto adicionado ao carrinho!');
    } catch (err) {
      toast.error('Erro ao adicionar ao carrinho');
    }
    setAddingToCart(false);
  };

  const handleToggleFavorite = () => {
    if (!product) return;
    if (!user) {
      toast.error('Faça login para favoritar produtos');
      return;
    }
    toggleFavorite(product.id);
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: `Confira este produto: ${product.name}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container px-4 py-8 pt-24">
          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            <div className="space-y-6">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-96 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container px-4 py-8 pt-24">
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">{error || 'Produto não encontrado'}</h1>
            <p className="text-muted-foreground mb-6">
              O produto que você procura não está disponível.
            </p>
            <Button onClick={() => navigate('/busca')}>
              Ver outros produtos
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const productIsFavorite = user ? isFavorite(product.id) : false;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container px-4 py-8 pt-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/busca" className="hover:text-primary">Início</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link to={`/busca?categoria=${product.category.slug}`} className="hover:text-primary">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Left Column - Images and Description */}
          <div className="space-y-6">
            {/* Main Image */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="relative">
                {/* Image Gallery */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-4">
                  <motion.img
                    key={selectedImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setIsZoomed(true)}
                  />
                  
                  {images.length > 1 && (
                    <>
                      <button 
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  <button 
                    onClick={() => setIsZoomed(true)}
                    className="absolute bottom-4 right-4 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === index 
                            ? "border-primary" 
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <img 
                          src={image} 
                          alt={`${product.name} - ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleToggleFavorite}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${productIsFavorite ? "fill-destructive text-destructive" : ""}`} />
                    <span className="text-sm">Favoritar</span>
                  </button>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    <span className="text-sm">Compartilhar</span>
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.sales_count} vendidos
                </span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold mb-4">Descrição do Produto</h2>
                <div 
                  className={`prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap ${!showAllDescription ? "line-clamp-[8]" : ""}`}
                >
                  {product.description}
                </div>
                {product.description.length > 400 && (
                  <button 
                    onClick={() => setShowAllDescription(!showAllDescription)}
                    className="flex items-center gap-2 text-primary mt-4 hover:underline"
                  >
                    {showAllDescription ? "Ver menos" : "Ver descrição completa"}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllDescription ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
            )}

            {/* Reviews Section */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <h2 className="text-xl font-semibold">Avaliações do Produto</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-5 h-5 ${star <= Math.round(product.review_average) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">{product.review_average.toFixed(1)}</span>
                    <span className="text-muted-foreground">({product.review_count})</span>
                  </div>
                  {!showReviewForm && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowReviewForm(true)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      {userReview ? 'Editar avaliação' : 'Avaliar'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-6">
                  <ReviewForm 
                    productId={product.id} 
                    onSuccess={handleReviewSuccess}
                    onCancel={() => setShowReviewForm(false)}
                  />
                </div>
              )}

              {reviews.length === 0 && !showReviewForm ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Este produto ainda não possui avaliações.</p>
                  <p className="text-sm mt-2">Seja o primeiro a avaliar!</p>
                </div>
              ) : reviews.length > 0 && (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="pb-6 border-b border-border last:border-0 last:pb-0">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                          {review.profile?.avatar_url ? (
                            <img 
                              src={review.profile.avatar_url} 
                              alt={review.profile?.full_name || 'Usuário'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              {(review.profile?.full_name || 'U')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{review.profile?.full_name || 'Usuário'}</span>
                              {review.is_verified_purchase && (
                                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                                  <Check className="w-3 h-3" />
                                  Compra verificada
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(review.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-4 h-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                              />
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-muted-foreground">{review.comment}</p>
                          )}
                          {review.photos && review.photos.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {review.photos.map((photo, index) => (
                                <img 
                                  key={index}
                                  src={photo}
                                  alt={`Foto da avaliação ${index + 1}`}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                              ))}
                            </div>
                          )}
                          <button className="flex items-center gap-2 mt-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            Útil ({review.helpful_count})
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {product.review_count > 5 && (
                <button className="w-full mt-6 py-3 text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors">
                  Ver todas as {product.review_count} avaliações
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Purchase Box */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            {/* Main Purchase Card */}
            <div className="bg-card rounded-2xl border border-border p-6">
              {/* Condition & Rating */}
              <div className="flex items-center gap-4 mb-3">
                <span className="text-sm text-muted-foreground">Novo</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{product.review_average.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({product.review_count})</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl font-semibold text-foreground mb-4">
                {product.name}
              </h1>

              {/* Price */}
              <div className="mb-6">
                {product.original_price && product.original_price > product.price && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.original_price)}
                    </span>
                    <span className="text-sm font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">
                      -{calculateDiscount(product.price, product.original_price)}%
                    </span>
                  </div>
                )}
                <p className="text-4xl font-bold text-foreground">
                  {formatPrice(product.price)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  em até <span className="text-primary font-medium">12x de {formatPrice(product.price / 12)}</span> sem juros
                </p>
              </div>

              {/* Shipping */}
              <div className="bg-muted/50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    {product.store.free_shipping ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 dark:text-green-400 font-semibold">Frete Grátis</span>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                          Economia garantida
                        </span>
                      </div>
                    ) : product.store.shipping_fee && product.store.shipping_fee > 0 ? (
                      <div>
                        <p className="text-sm font-medium">
                          Frete: <span className="text-primary">{formatPrice(product.store.shipping_fee)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Valor fixo para sua cidade
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Frete a combinar com o vendedor
                      </p>
                    )}
                  </div>
                </div>
                {product.store.city && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Enviado de</p>
                      <p className="text-sm">
                        {product.store.address_neighborhood ? `${product.store.address_neighborhood}, ` : ''}
                        {product.store.city.name} - {product.store.city.state}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Estoque disponível:</span>
                <span className={`text-sm font-medium ${product.stock > 5 ? "text-green-600" : product.stock > 0 ? "text-orange-500" : "text-destructive"}`}>
                  {product.stock > 0 ? `${product.stock} unidades` : 'Esgotado'}
                </span>
              </div>

              {/* Quantity */}
              {product.stock > 0 && (
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm text-muted-foreground">Quantidade:</span>
                  <div className="flex items-center border border-border rounded-lg">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-muted transition-colors"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="p-2 hover:bg-muted transition-colors"
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full h-12 text-lg font-semibold" 
                  size="lg"
                  disabled={product.stock === 0}
                  onClick={() => {
                    handleAddToCart();
                    navigate(`/checkout/${product.store.id}`);
                  }}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Comprar Agora
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-lg" 
                  size="lg"
                  disabled={product.stock === 0 || addingToCart}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Adicionar ao Carrinho
                </Button>
              </div>

              {/* Features */}
              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Compra Garantida</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Produto Original</span>
                </div>
              </div>
            </div>

            {/* Seller Card */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4">Vendido por</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {product.store.logo_url ? (
                    <img src={product.store.logo_url} alt={product.store.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{product.store.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{product.store.rating_average.toFixed(1)}</span>
                    <span>•</span>
                    <span>{product.store.rating_count} avaliações</span>
                  </div>
                </div>
              </div>
              {product.store.city && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {product.store.city.name}, {product.store.city.state}
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate(`/loja/${product.store.slug}`)}
              >
                Ver loja
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsZoomed(false)}
          >
            <button 
              className="absolute top-4 right-4 w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
              onClick={() => setIsZoomed(false)}
            >
              <X className="w-6 h-6" />
            </button>
            
            {images.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 w-12 h-12 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            <motion.img
              key={selectedImage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={images[selectedImage]}
              alt={product.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {images.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 w-12 h-12 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Thumbnails in Modal */}
            {images.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(index); }}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index 
                        ? "border-primary" 
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img 
                      src={image} 
                      alt={`${product.name} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default ProductPage;
