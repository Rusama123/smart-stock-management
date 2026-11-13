// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import useScripts, { reinitPlugins } from "./hooks/useScripts";

import HomePage    from "./Admin/pages/HomePage";
import PricingPage from "./Admin/pages/PricingPage";
import AppointmentPage from "./Admin/pages/AppointmentPage";
import Contact     from "./Admin/pages/contact";
import About       from "./Admin/pages/about";

import Login          from "./Admin/login";
import Register       from "./Admin/register";
import ForgotPassword from "./Admin/ForgotPassword";

import Dashboard   from "./Admin/pages/dashboard";
import Inventory   from "./Admin/pages/inventory";
import Alert       from "./Admin/pages/alerts";
import Suppliers   from "./Admin/pages/suppliers";
import PharmacyPOS from "./Admin/pages/PharmacyPOS";
import AIInsights from "./Admin/pages/AIInsights";
import AdminControl    from "./Admin/control-panel/admin-control";
import SuperAdminUsers from "./Admin/control-panel/super-admin-users";
import PaymentSuccess from "./Admin/pages/PaymentSuccess";
import PaymentCancel  from "./Admin/pages/PaymentCancel";
import ChatbotWidget from "./components/Chatbot/ChatbotWidget";
import InventoryChatbot from "./components/Chatbot/InventoryChatbot";
import { ProtectedRoute, ProtectedAdminRoute, ProtectedSuperAdminRoute } from "./components/ProtectedRoute";

const RouteChangeHandler = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const t = setTimeout(reinitPlugins, 300);
    return () => clearTimeout(t);
  }, [location.pathname]);
  return null;
};

/** Symptom Mediserver on /ai-assistant; pharmacy stock chat for pharmacy users; public finder on public pages */
const ChatbotRouter = () => {
  const { pathname } = useLocation();

  if (
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/register") ||
    pathname.startsWith("/admin/forgot-password") ||
    pathname.startsWith("/payment/") ||
    pathname.startsWith("/Admin/control-panel")
  ) {
    return null;
  }

  if (pathname === "/ai-assistant") {
    return <ChatbotWidget />;
  }

  if (pathname.startsWith("/admin/pages/")) {
    let role = null;
    try {
      role = JSON.parse(localStorage.getItem("user") || "{}")?.role;
    } catch {
      role = null;
    }
    if (role === "user") {
      return <InventoryChatbot type="single" />;
    }
    return null;
  }

  return <InventoryChatbot type="public" />;
};

const App = () => {
  useScripts();

  return (
    <BrowserRouter>
      <RouteChangeHandler />
      <Routes>
        <Route path="/"        element={<HomePage />} />
        <Route path="/ai-assistant" element={<HomePage />} />
        <Route path="/about"   element={<About />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/appointment" element={<AppointmentPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel"  element={<PaymentCancel />} />

        <Route path="/admin/login"           element={<Login />} />
        <Route path="/admin/register"        element={<Register />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />

        <Route path="/admin/pages/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/pages/inventory"   element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/admin/pages/alerts"      element={<ProtectedRoute><Alert /></ProtectedRoute>} />
        <Route path="/admin/pages/suppliers"   element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
        <Route path="/admin/pages/PharmacyPOS" element={<ProtectedRoute><PharmacyPOS /></ProtectedRoute>} />
        <Route path="/admin/pages/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />

        <Route path="/Admin/control-panel/admin-control"
          element={<ProtectedAdminRoute><AdminControl /></ProtectedAdminRoute>} />
        <Route path="/Admin/control-panel/super-admin-users"
          element={<ProtectedSuperAdminRoute><SuperAdminUsers /></ProtectedSuperAdminRoute>} />
      </Routes>
      <ChatbotRouter />
    </BrowserRouter>
  );
};

export default App;