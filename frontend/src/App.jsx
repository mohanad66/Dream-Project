// src/App.js - CLS Optimized Version
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import React, { Suspense, lazy, useCallback, useMemo } from "react";
import "./css/style.scss";
import { useAuth } from "./services/auth";

// 1. EAGER LOADING CORE UI COMPONENTS
// To prevent CLS, the Navbar and main layout containers should never be lazy-loaded.
import Navbar from "./Components/Navbar/index.jsx";
import TopBar from "./Components/TopBar/index.jsx";
import Footer from "./Components/Footer/index.jsx";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute.jsx";
import ToastProvider from "./Components/Toast/ToastProvider.jsx";

// Lazy load page-level components
const Home = lazy(() => import("./Pages/Home/index.jsx"));
const Products = lazy(() => import("./Pages/Products/index.jsx"));
const Cart = lazy(() => import("./Pages/Cart/index.jsx"));
const Login = lazy(() => import("./Pages/Login/Login.jsx"));
const Register = lazy(() => import("./Pages/Register/Register.jsx"));
const SellerRegister = lazy(() => import("./Pages/Seller/SellerRegister.jsx"));
const SellerDashboard = lazy(() => import("./Pages/Seller/Dashboard.jsx"));
const ProfilePage = lazy(() => import("./Pages/Profile/index.jsx"));
const CheckoutPage = lazy(() => import("./Pages/Checkout/index.jsx"));
const VerifyOtp = lazy(() => import("./Pages/OTP/OTPVerify.jsx"));
const AdminAnalytics = lazy(() => import("./Pages/AdminAnalytics.jsx"));
const ForgotPassword = lazy(
  () => import("./Components/Form/ForgotPassword.jsx"),
);
const VerifyEmail = lazy(() => import("./Components/Form/VerifyEmail.jsx"));
const OrderDetailsPage = lazy(() => import("./Pages/OrderDetails/index.jsx"));
const OrdersPage = lazy(() => import("./Pages/Orders/index.jsx"));
const SellerProfilePage = lazy(() => import("./Pages/Seller/SellerProfile.jsx"));
const PaymentResult = lazy(() => import("./Pages/PaymentResult/index.jsx"));
const NotificationsPage = lazy(() => import("./Pages/Notifications/index.jsx"));
const WishlistPage = lazy(() => import("./Pages/Wishlist/index.jsx"));
const ShortsPage = lazy(() => import("./Pages/Shorts/index.jsx"));
const SellersPage = lazy(() => import("./Pages/Sellers/index.jsx"));
const UploadPage = lazy(() => import("./Pages/Upload/index.jsx"));
const ProductDetail = lazy(() => import("./Pages/ProductDetail/index.jsx"));
const CategoryPage = lazy(() => import("./Pages/Category/index.jsx"));
const AboutPage = lazy(() => import("./Pages/About us/index.jsx"));

const LoadingFallback = () => (
  <div className="loading-container">
    <div
      style={{
        display: "flex",
        textAlign: "center",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          border: "3px solid var(--border-color, #232d3f)",
          borderTop: "3px solid var(--color-gold, #6366f1)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "auto",
        }}
      />
      <p style={{ color: "var(--text-primary, #f0efe8)", fontSize: 14, margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        instaBrandz
      </p>
    </div>
  </div>
);

const HIDE_NAVBAR_ROUTES = ["/checkout", "/login", "/register", "/verify-otp", "/seller-register", "/payment/result", "/shorts"];

export default function App() {
  const { data, login, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = useCallback(
    async (userData) => {
      const success = await login(userData);
      if (success) navigate("/");
    },
    [login, navigate],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const shouldShowNavbar = useMemo(
    () => !HIDE_NAVBAR_ROUTES.includes(location.pathname),
    [location.pathname],
  );

  const isHome = location.pathname === "/";

  const commonData = data || {};
  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <ToastProvider>
      <div
        className="app-wrapper"
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        {shouldShowNavbar && !isHome && <TopBar />}
        {shouldShowNavbar && <Navbar onLogout={handleLogout} />}

        <main className={shouldShowNavbar ? "tabnav-page" : "tabnav-free"} style={{ flex: 1 }}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="/register" element={<Register />} />
              <Route path="/seller-register" element={<SellerRegister />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route
                path="/"
                element={
                  <Home
                    contacts={commonData.contacts || []}
                    img={commonData.imgs || []}
                    services={commonData.services || []}
                    categories={commonData.categories || []}
                    products={commonData.products || []}
                    tags={commonData.tags || []}
                  />
                }
              />

              <Route
                path="/products"
                element={
                  <Products
                    products={commonData.products || []}
                    categories={commonData.categories || []}
                    tags={commonData.tags || []}
                  />
                }
              />

              <Route
                path="/shorts"
                element={
                  <ShortsPage
                    categories={commonData.categories || []}
                    tags={commonData.tags || []}
                  />
                }
              />

              <Route
                path="/sellers"
                element={<SellersPage />}
              />

              <Route
                path="/cart"
                element={<Cart categories={commonData.categories || []} />}
              />

              <Route
                path="/checkout"
                element={<CheckoutPage />}
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage
                      categories={commonData.categories}
                      tags={commonData.tags}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller/dashboard"
                element={
                  <ProtectedRoute>
                    <SellerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute>
                    <OrderDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route path="/seller/orders" element={
                <Navigate to="/seller/dashboard" replace />
              } />
              <Route path="/seller/products" element={
                <ProtectedRoute>
                  <SellerDashboard initialTab="products" />
                </ProtectedRoute>
              } />
              <Route path="/seller/:id" element={<SellerProfilePage />} />
              <Route
                path="/product/:id"
                element={
                  <ProductDetail
                    categories={commonData.categories || []}
                    tags={commonData.tags || []}
                  />
                }
              />
              <Route
                path="/category/:id"
                element={
                  <CategoryPage
                    categories={commonData.categories || []}
                    tags={commonData.tags || []}
                  />
                }
              />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/payment/result" element={<PaymentResult />} />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <WishlistPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        {shouldShowNavbar && (
          <Footer
            contacts={commonData.contacts || []}
            categories={commonData.categories || []}
          />
        )}
      </div>
    </ToastProvider>
  );
}
