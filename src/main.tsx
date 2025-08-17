import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { MeetingsProvider } from "@/contexts/MeetingsContext";
import { useZapierNotifications } from "@/hooks/useZapierNotifications";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Community from "./pages/Community";
import Courses from "./pages/Courses";
import Documents from "./pages/Documents";
import Members from "./pages/Members";
import Calendar from "./pages/Calendar";
import Investments from "./pages/Investments";
import FamilyRoundtable from "./pages/FamilyRoundtable";

import ProfileSettings from "./pages/ProfileSettings";
import Help from "./pages/Help";
import Contact from "./pages/Contact";

import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { AIChat } from "@/components/dashboard/ai-chat";
import { initializeMobileServices } from "./lib/mobile";
import "./index.css";

const queryClient = new QueryClient();

// Initialize mobile services
initializeMobileServices();

function AppWithNotifications() {
  useZapierNotifications()
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/community" element={<Community />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/documents" element={<Investments />} />
      <Route path="/family-roundtable" element={<FamilyRoundtable />} />
      <Route path="/calendar" element={<Calendar />} />
      
      <Route path="/members" element={<Members />} />
      
      <Route path="/investments" element={<Investments />} />
      
      <Route path="/profile-settings" element={<ProfileSettings />} />
      <Route path="/help" element={<Help />} />
      <Route path="/contact" element={<Contact />} />
    </Routes>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="light" storageKey="family-dashboard-theme">
          <AuthProvider>
            <MeetingsProvider>
              <AppWithNotifications />
              <MobileBottomNav />
              <AIChat />
              <Toaster />
            </MeetingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
