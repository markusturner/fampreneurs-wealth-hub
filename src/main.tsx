import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { MeetingsProvider } from "@/contexts/MeetingsContext";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Documents from "./pages/Documents";
import Community from "./pages/Community";
import Courses from "./pages/Courses";
import Coaching from "./pages/Coaching";
import Members from "./pages/Members";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="light" storageKey="family-dashboard-theme">
          <AuthProvider>
            <MeetingsProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/coaching" element={<Coaching />} />
                  <Route path="/members" element={<Members />} />
                </Routes>
              <Toaster />
            </MeetingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
