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
import AdminDashboard from "./pages/AdminDashboard";
import Documents from "./pages/Documents";
import Community from "./pages/Community";
import Courses from "./pages/Courses";
import Coaching from "./pages/Coaching";
import Members from "./pages/Members";
import TeamMembers from "./pages/TeamMembers";
import FamilyMembers from "./pages/FamilyMembers";
import Investments from "./pages/Investments";
import ProfileSettings from "./pages/ProfileSettings";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
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
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/community" element={<Community />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/coaching" element={<Coaching />} />
      <Route path="/members" element={<TeamMembers />} />
      <Route path="/team-members" element={<TeamMembers />} />
      <Route path="/family-members" element={<FamilyMembers />} />
      <Route path="/investments" element={<Investments />} />
      <Route path="/profile-settings" element={<ProfileSettings />} />
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
              <MobileNavigation />
              <Toaster />
            </MeetingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
