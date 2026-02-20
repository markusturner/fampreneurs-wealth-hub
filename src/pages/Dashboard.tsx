import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { OverviewSection } from "@/components/dashboard/overview-section"
import { Loader2 } from 'lucide-react'
import { useState } from "react"
import { useUserRole } from "@/hooks/useUserRole"
import { useTutorialVideo } from "@/hooks/useTutorialVideo"
import { TutorialVideoModal } from "@/components/dashboard/tutorial-video-modal"
import { supabase } from "@/integrations/supabase/client"
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity"
import { useSubscription } from "@/hooks/useSubscription"
import { useIsAdminOrOwner } from "@/hooks/useIsAdminOrOwner"
import { useOwnerRole } from "@/hooks/useOwnerRole"

const Dashboard = () => {
  const { user, profile, loading } = useAuth()
  const { isFamilyOfficeOnly, isLoading: roleLoading } = useUserRole()
  const { isAdminOrOwner } = useIsAdminOrOwner()
  const { isOwner } = useOwnerRole(user?.id ?? null)
  const { subscriptionStatus } = useSubscription()
  const navigate = useNavigate()
  const { shouldShowTutorial, isLoading: tutorialLoading, markAsWatched } = useTutorialVideo(user?.id || null)

  // Only show tutorial if user actually has TruHeirs access
  const hasTruHeirsAccess = isAdminOrOwner || isOwner || profile?.truheirs_access === true || subscriptionStatus.subscribed
  const showTutorial = shouldShowTutorial && hasTruHeirsAccess

  const handleTutorialSkipped = async () => {
    if (!user?.id) return;
    try {
      await supabase.from("notifications").insert({
        sender_id: user.id,
        user_id: user.id,
        notification_type: "tutorial_reminder",
        title: "Tutorial Video Available",
        message: "You skipped the tutorial video. Watch it anytime to get started!",
        is_read: false,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
    markAsWatched();
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [user, loading, navigate])

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const displayName = profile?.display_name || profile?.first_name || 'Family'

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-full overflow-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Your financial overview, key metrics, and recent activity at a glance.
        </p>
      </div>
      <DashboardStats />
      <OverviewSection />
      <DashboardRecentActivity />
      {user && showTutorial && (
        <TutorialVideoModal
          isOpen={showTutorial}
          onClose={() => markAsWatched()}
          onWatched={markAsWatched}
          onSkipped={handleTutorialSkipped}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
