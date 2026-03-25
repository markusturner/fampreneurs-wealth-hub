
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { MeetingsProvider } from "@/contexts/MeetingsContext";
import { useZapierNotifications } from "@/hooks/useZapierNotifications";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/layout/AppLayout";
// Landing page removed - auth is the default
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import AuthFamily from "./pages/AuthFamily";
import AuthTrustee from "./pages/AuthTrustee";
import SignUp from "./pages/SignUp";
import ThankYou from "./pages/ThankYou";
import Community from "./pages/Community";
import Courses from "./pages/Courses";
import Documents from "./pages/Documents";
import Members from "./pages/Members";
import Calendar from "./pages/Calendar";
import Investments from "./pages/Investments";
import WorkspaceCommunity from "./pages/WorkspaceCommunity";
import Classroom from "./pages/Classroom";
import CourseDetail from "./pages/CourseDetail";
import WorkspaceMembers from "./pages/WorkspaceMembers";
import WorkspaceCalendar from "./pages/WorkspaceCalendar";
import Messenger from "./pages/Messenger";
import OnboardingSubmissions from "./pages/OnboardingSubmissions";

import FamilyGovernance from "./pages/FamilyGovernance";
import FamilyConstitutionSetup from "./pages/FamilyConstitutionSetup";
import Search from "./pages/Search";

import Onboarding from "./pages/Onboarding";
import ProfileSettings from "./pages/ProfileSettings";
import AdminSettings from "./pages/AdminSettings";
import TutorialVideos from "./pages/TutorialVideos";
import Help from "./pages/Help";
import Contact from "./pages/Contact";
import ContactSupport from "./pages/ContactSupport";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";

import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import AIChat from "./pages/AIChat";
import TrustCreation from "./pages/TrustCreation";
import TrustFormSubmissions from "./pages/TrustFormSubmissions";
import ProgramAgreement from "./pages/ProgramAgreement";
import ProgramAgreements from "./pages/ProgramAgreements";
import ProfilePhotoUpload from "./pages/ProfilePhotoUpload";

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

/** Wrap a page in the authenticated sidebar layout */
function WithLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}

function AppWithNotifications() {
  useZapierNotifications()
  return (
    <>
      <Routes>
        {/* Public routes - no sidebar */}
        <Route path="/" element={<Auth />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/program-agreement" element={<ProgramAgreement />} />
        <Route path="/profile-photo" element={<ProfilePhotoUpload />} />

        {/* Authenticated routes - with sidebar */}
        <Route path="/dashboard" element={<WithLayout><Dashboard /></WithLayout>} />
        <Route path="/community" element={<WithLayout><Community /></WithLayout>} />
        <Route path="/digital-family-office" element={<WithLayout><Community /></WithLayout>} />
        <Route path="/workspace-community" element={<WithLayout><WorkspaceCommunity /></WithLayout>} />
        <Route path="/classroom" element={<WithLayout><Classroom /></WithLayout>} />
        <Route path="/classroom/:courseId" element={<WithLayout><CourseDetail /></WithLayout>} />
        <Route path="/workspace-members" element={<WithLayout><WorkspaceMembers /></WithLayout>} />
        <Route path="/workspace-calendar" element={<WithLayout><WorkspaceCalendar /></WithLayout>} />
        <Route path="/messenger" element={<WithLayout><Messenger /></WithLayout>} />
        <Route path="/onboarding-submissions" element={<WithLayout><OnboardingSubmissions /></WithLayout>} />
        <Route path="/courses" element={<WithLayout><Courses /></WithLayout>} />
        <Route path="/documents" element={<WithLayout><Documents /></WithLayout>} />
        <Route path="/family-roundtable" element={<WithLayout><Dashboard /></WithLayout>} />
        <Route path="/family-governance" element={<WithLayout><FamilyGovernance /></WithLayout>} />
        <Route path="/family-constitution/setup" element={<WithLayout><FamilyConstitutionSetup /></WithLayout>} />
        <Route path="/calendar" element={<WithLayout><Calendar /></WithLayout>} />
        <Route path="/members" element={<WithLayout><Members /></WithLayout>} />
        <Route path="/investments" element={<WithLayout><Investments /></WithLayout>} />
        <Route path="/profile-settings" element={<WithLayout><ProfileSettings /></WithLayout>} />
        <Route path="/admin-settings" element={<WithLayout><AdminSettings /></WithLayout>} />
        <Route path="/tutorial-videos" element={<WithLayout><TutorialVideos /></WithLayout>} />
        <Route path="/help" element={<WithLayout><Help /></WithLayout>} />
        <Route path="/contact" element={<WithLayout><Contact /></WithLayout>} />
        <Route path="/contact-support" element={<WithLayout><ContactSupport /></WithLayout>} />
        <Route path="/search" element={<WithLayout><Search /></WithLayout>} />
        <Route path="/ai-chat" element={<WithLayout><AIChat /></WithLayout>} />
        <Route path="/trust-creation" element={<WithLayout><TrustCreation /></WithLayout>} />
        <Route path="/trust-form-submissions" element={<WithLayout><TrustFormSubmissions /></WithLayout>} />
        <Route path="/program-agreements" element={<WithLayout><ProgramAgreements /></WithLayout>} />
        
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
        <ThemeProvider defaultTheme="light" storageKey="family-dashboard-theme">
          <AuthProvider>
            <MeetingsProvider>
              <AppWithNotifications />
              
              <Toaster />
            </MeetingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);