import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { CityProvider } from "@/hooks/useCity";
import { FavoritesProvider } from "@/hooks/FavoritesContext";
import { ThemeProvider } from "@/hooks/useThemeColors";
import { CartProvider } from "@/hooks/useCart";
import { NotificationPrompt } from "@/components/chat/NotificationPrompt";
import { GlobalChatNotifications } from "@/components/chat/GlobalChatNotifications";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import Auth from "./pages/Auth";
import StorePage from "./pages/StorePage";
import FavoritesPage from "./pages/FavoritesPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersHistoryPage from "./pages/OrdersHistoryPage";
import MerchantDashboard from "./pages/dashboard/MerchantDashboard";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import StoreManagement from "./pages/dashboard/StoreManagement";
import ProductsManagement from "./pages/dashboard/ProductsManagement";
import OrdersManagement from "./pages/dashboard/OrdersManagement";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import CouponsManagement from "./pages/dashboard/CouponsManagement";
import ChatManagement from "./pages/dashboard/ChatManagement";
import BannerManagement from "./pages/dashboard/BannerManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminStores from "./pages/admin/AdminStores";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCities from "./pages/admin/AdminCities";
import AdminReports from "./pages/admin/AdminReports";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminPointsSettings from "./pages/admin/AdminPointsSettings";
import AdminAppearance from "./pages/admin/AdminAppearance";
import AdminHeroSettings from "./pages/admin/AdminHeroSettings";
import AdminSystemLinks from "./pages/admin/AdminSystemLinks";
import AdminGuestsPage from "./pages/admin/AdminGuestsPage";
import AdminTestimonials from "./pages/admin/AdminTestimonials";
import AdminPartnerLogos from "./pages/admin/AdminPartnerLogos";
import ProductPage from "./pages/ProductPage";
import AboutPage from "./pages/AboutPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfUsePage from "./pages/TermsOfUsePage";
import FAQPage from "./pages/FAQPage";
import MyPointsPage from "./pages/MyPointsPage";
import ProfilePage from "./pages/ProfilePage";
import PointsManagement from "./pages/dashboard/PointsManagement";
import RewardsManagement from "./pages/dashboard/RewardsManagement";
import DescontosPage from "./pages/DescontosPage";
import SystemsPage from "./pages/dashboard/SystemsPage";
import SubscriptionPage from "./pages/dashboard/SubscriptionPage";
import MunicipalDashboard from "./pages/municipal/MunicipalDashboard";
import MunicipalLinks from "./pages/municipal/MunicipalLinks";
import MunicipalServices from "./pages/municipal/MunicipalServices";
import MunicipalEvents from "./pages/municipal/MunicipalEvents";
import MunicipalPolls from "./pages/municipal/MunicipalPolls";
import MunicipalProfileSettings from "./pages/municipal/MunicipalProfileSettings";
import PublicUtilityPage from "./pages/PublicUtilityPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
      <ThemeProvider>
        <CityProvider>
          <FavoritesProvider>
            <CartProvider>
              <TooltipProvider>
                <div className="min-h-screen bg-background">
                  <Toaster />
                  <Sonner />
                  <NotificationPrompt />
                  <GlobalChatNotifications />
                  <PWAInstallPrompt />
                  <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/busca" element={<HomePage />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/loja/:slug" element={<StorePage />} />
                    <Route path="/favoritos" element={<FavoritesPage />} />
                    <Route path="/checkout/:storeId" element={<CheckoutPage />} />
                    <Route path="/meus-pedidos" element={<OrdersHistoryPage />} />
                    <Route path="/produto/:id" element={<ProductPage />} />
                    <Route path="/sobre" element={<AboutPage />} />
                    <Route path="/privacidade" element={<PrivacyPolicyPage />} />
                    <Route path="/termos" element={<TermsOfUsePage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/meus-pontos" element={<MyPointsPage />} />
                    <Route path="/perfil" element={<ProfilePage />} />
                    <Route path="/descontos" element={<DescontosPage />} />
                
                {/* Merchant Dashboard */}
                <Route path="/dashboard" element={<MerchantDashboard />}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="loja" element={<StoreManagement />} />
                  <Route path="produtos" element={<ProductsManagement />} />
                  <Route path="cupons" element={<CouponsManagement />} />
                  <Route path="mensagens" element={<ChatManagement />} />
                  <Route path="banner" element={<BannerManagement />} />
                  <Route path="pedidos" element={<OrdersManagement />} />
                  <Route path="pontos" element={<PointsManagement />} />
                  <Route path="recompensas" element={<RewardsManagement />} />
                  <Route path="configuracoes" element={<DashboardSettings />} />
                  <Route path="sistemas" element={<SystemsPage />} />
                  <Route path="planos" element={<SubscriptionPage />} />
                </Route>

                {/* Admin Dashboard */}
                <Route path="/admin" element={<AdminDashboard />}>
                  <Route index element={<AdminOverview />} />
                  <Route path="usuarios" element={<AdminUsers />} />
                  <Route path="lojas" element={<AdminStores />} />
                  <Route path="produtos" element={<AdminProducts />} />
                  <Route path="categorias" element={<AdminCategories />} />
                  <Route path="cidades" element={<AdminCities />} />
                  <Route path="banners" element={<AdminBanners />} />
                  <Route path="cupons" element={<AdminCoupons />} />
                  <Route path="pontos" element={<AdminPointsSettings />} />
                  <Route path="relatorios" element={<AdminReports />} />
                  <Route path="aparencia" element={<AdminAppearance />} />
                  <Route path="hero" element={<AdminHeroSettings />} />
                  <Route path="sistemas" element={<AdminSystemLinks />} />
                  <Route path="convidados" element={<AdminGuestsPage />} />
                  <Route path="depoimentos" element={<AdminTestimonials />} />
                  <Route path="parceiros" element={<AdminPartnerLogos />} />
                  </Route>

                {/* Municipal Dashboard */}
                <Route path="/prefeitura" element={<MunicipalDashboard />}>
                  <Route index element={<MunicipalLinks />} />
                  <Route path="servicos" element={<MunicipalServices />} />
                  <Route path="agenda" element={<MunicipalEvents />} />
                  <Route path="enquetes" element={<MunicipalPolls />} />
                  <Route path="perfil" element={<MunicipalProfileSettings />} />
                </Route>

                {/* Public Utility */}
                <Route path="/utilidade-publica" element={<PublicUtilityPage />} />
                  </Routes>
                </BrowserRouter>
              </div>
            </TooltipProvider>
            </CartProvider>
          </FavoritesProvider>
        </CityProvider>
      </ThemeProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
