
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { MeetingsProvider } from "@/contexts/MeetingsContext";
import { useZapierNotifications } from "@/hooks/useZapierNotifications";
import { ThemeProvider } from "@/components/theme-provider";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Community from "./pages/Community";
import Courses from "./pages/Courses";
import Documents from "./pages/Documents";
import Members from "./pages/Members";
import Calendar from "./pages/Calendar";
import Investments from "./pages/Investments";

import FamilyGovernance from "./pages/FamilyGovernance";
import Search from "./pages/Search";

import ProfileSettings from "./pages/ProfileSettings";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import ContactSupport from "./pages/ContactSupport";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";

import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { AIChat } from "@/components/dashboard/ai-chat";
import { initializeMobileServices } from "./lib/mobile";
import "./index.css";

const queryClient = new QueryClient();

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+K or Cmd+K to open search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    window.location.href = '/search'
  }
})

// Fix mobile viewport height for consistent mobile UI - with proper cleanup
let viewportHeightInitialized = false

const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

if (!viewportHeightInitialized) {
  setViewportHeight()
  window.addEventListener('resize', setViewportHeight, { passive: true })
  window.addEventListener('orientationchange', setViewportHeight, { passive: true })
  viewportHeightInitialized = true
}

// Initialize mobile services
initializeMobileServices();

function AppWithNotifications() {
  useZapierNotifications()
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/community" element={<Community />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/family-roundtable" element={<Dashboard />} />
        <Route path="/family-governance" element={<FamilyGovernance />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/members" element={<Members />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/profile-settings" element={<ProfileSettings />} />
        <Route path="/help" element={<Help />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/contact-support" element={<ContactSupport />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/search" element={<Search />} />
        <Route path="*" element={<div>Page not found</div>} />
      </Routes>
      <MobileBottomNav />
    </>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark" storageKey="family-dashboard-theme">
          <AuthProvider>
            <MeetingsProvider>
              <AppWithNotifications />
              <AIChat />
              <Toaster />
            </MeetingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
