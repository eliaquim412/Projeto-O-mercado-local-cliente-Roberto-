import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Store, Search, Landmark, Briefcase, Link2, CalendarDays, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import CategoriesSearch from "@/components/home/CategoriesSearch";
import FeaturedStoresLanding from "@/components/home/FeaturedStoresLanding";
import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { useAuth } from "@/hooks/useAuth";
import clubeFidelidadeBanner from "@/assets/banners/clube-fidelidade-banner.png";
import clubeFidelidadeBannerMobile from "@/assets/banners/clube-fidelidade-banner-mobile.png";
import HeroBannerCarousel from "@/components/home/HeroBannerCarousel";
import CouponTickets from "@/components/home/CouponTickets";
import infoCardBanner from "@/assets/banners/info-card.png";
import infoCardBannerMobile from "@/assets/banners/info-card-mobile.png";
import { supabase } from "@/integrations/supabase/client";
import DiscountClubPopup from "@/components/home/DiscountClubPopup";

interface HeroSettings {
  titleLine1: string;
  titleLine2: string;
  searchPlaceholder: string;
  subtitle: string;
  subtitleHighlight: string;
  badgeText: string;
}

const defaultHeroSettings: HeroSettings = {
  titleLine1: 'Compre e venda com',
  titleLine2: 'facilidade & segurança',
  searchPlaceholder: 'Buscar lojas...',
  subtitle: 'Encontre as melhores lojas perto de você. Eletrônicos, moda, casa, veículos e muito mais.',
  subtitleHighlight: 'Comece a explorar agora.',
  badgeText: 'O maior marketplace do Brasil',
};

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDefaultBanner, setIsDefaultBanner] = useState(true);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(defaultHeroSettings);

  useEffect(() => {
    const fetchHeroSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'hero_settings')
        .maybeSingle();
      if (data?.setting_value) {
        setHeroSettings({ ...defaultHeroSettings, ...(data.setting_value as unknown as HeroSettings) });
      }
    };
    fetchHeroSettings();
  }, []);

  const handleSearchClick = () => {
    navigate('/busca');
  };

  const handleSellClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleStoresClick = () => {
    navigate('/busca');
  };

  return <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <DiscountClubPopup />
      
      {/* Hero Section - Fixed height */}
      <section className="relative isolate overflow-hidden min-h-[600px] md:min-h-[700px]">
        {/* Background Images - Full Width with Carousel */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Banner Carousel - always includes default + store banners */}
          <HeroBannerCarousel 
            autoPlay 
            interval={5000} 
            onBannerChange={(isDefault) => setIsDefaultBanner(isDefault)}
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent pointer-events-none" />
        </div>

        {/* Hero Content Container - Always same height */}
        <div className="container relative z-10 px-4 pt-40 pb-20 min-h-[600px] md:min-h-[700px] flex flex-col justify-center">
          {/* Hero Content - Always visible */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
          >
              <motion.div initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                delay: 0.2
              }} className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
                <span className="text-sm font-medium text-foreground drop-shadow">
                  <Store className="w-4 h-4 inline-block mr-2" />
                  {heroSettings.badgeText}
                </span>
              </motion.div>
              
              <div className="max-w-4xl relative z-10">
                <h1 className="text-5xl md:text-7xl font-normal mb-6 tracking-tight text-left">
              <span className="text-foreground">
                    <TextGenerateEffect words={heroSettings.titleLine1} />
                  </span>
                  <br />
                  <span className="text-primary font-medium">
                    <TextGenerateEffect words={heroSettings.titleLine2} />
                  </span>
                </h1>

                {/* Search Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mb-8"
                >
                  <div
                    onClick={handleSearchClick}
                    className="max-w-xl w-full flex items-center gap-3 px-5 py-4 bg-card/80 backdrop-blur-sm border border-border/50 rounded-full cursor-pointer hover:bg-card/90 hover:border-border transition-all shadow-lg"
                  >
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground text-base">{heroSettings.searchPlaceholder}</span>
                  </div>
                </motion.div>
                
                <motion.p initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  delay: 0.4
                }} className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl text-left">
                {heroSettings.subtitle}{" "}
                  <span className="text-foreground">{heroSettings.subtitleHighlight}</span>
                </motion.p>
                
                <motion.div initial={{
                  opacity: 0,
                  y: 20
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  delay: 0.5
                }} className="flex flex-col sm:flex-row gap-4 items-start">
                  <Button size="lg" className="button-gradient" onClick={handleSellClick}>
                    Quero Vender
                  </Button>
                  <Button size="lg" variant="link" className="text-foreground" onClick={handleStoresClick}>
                    Ver Lojas <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
        </div>
      </section>

      {/* Categories Search Section */}
      <CategoriesSearch />

      {/* Coupon Tickets Section */}
      <CouponTickets />

      {/* Featured Stores Section */}
      <FeaturedStoresLanding />

      {/* Clube de Fidelidade Banner */}
      <section className="container mx-auto px-4 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="cursor-pointer overflow-hidden rounded-2xl"
          onClick={() => navigate('/descontos')}
        >
          <img
            src={clubeFidelidadeBanner}
            alt="Clube de Fidelidade - Acumule pontos e ganhe recompensas"
            className="w-full h-auto object-cover hidden md:block"
          />
          <img
            src={clubeFidelidadeBannerMobile}
            alt="Clube de Fidelidade - Acumule pontos e ganhe recompensas"
            className="w-full h-auto object-cover md:hidden"
          />
        </motion.div>
      </section>

      {/* Utilidade Pública CTA */}
      <section className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-6 md:p-8 border border-primary/20"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Utilidade Pública</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Serviços', icon: Briefcase, tab: 'services' },
              { label: 'Tudo na Mão', icon: Link2, tab: 'links' },
              { label: 'Eventos', icon: CalendarDays, tab: 'events' },
              { label: 'Enquetes', icon: BarChart3, tab: 'polls' },
            ].map((item) => (
              <Button
                key={item.tab}
                variant="outline"
                onClick={() => navigate(`/utilidade-publica?aba=${item.tab}`)}
                className="flex items-center justify-center gap-2 h-11 rounded-full text-sm font-medium border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <div className="bg-background">
        <TestimonialsSection />
      </div>

      {/* Info Card */}
      <section className="container mx-auto px-4 py-8">
        <img
          src={infoCardBanner}
          alt="+120 empresas locais já vendem no Mercado Local - Milhares de usuários economizando diariamente - Sua plataforma de confiança para o comércio local"
          className="w-full h-auto object-cover rounded-2xl hidden md:block"
        />
        <img
          src={infoCardBannerMobile}
          alt="+120 empresas locais já vendem no Mercado Local - Milhares de usuários economizando diariamente - Sua plataforma de confiança para o comércio local"
          className="w-full h-auto object-cover rounded-2xl md:hidden"
        />
      </section>

      {/* Footer */}
      <div className="bg-background">
        <Footer />
      </div>
    </div>;
};
export default Index;