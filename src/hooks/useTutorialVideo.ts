import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTutorialVideo = (userId: string | null) => {
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    checkTutorialStatus();
  }, [userId]);

  const checkTutorialStatus = async () => {
    if (!userId) return;

    try {
      // Check localStorage first for immediate feedback
      const hasWatched = localStorage.getItem(`tutorial_watched_${userId}`);
      
      if (hasWatched) {
        setShouldShowTutorial(false);
        setIsLoading(false);
        return;
      }

      // Check if user has a watched notification in database
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("notification_type", "tutorial_reminder")
        .eq("is_read", true)
        .single();

      if (notifications) {
        localStorage.setItem(`tutorial_watched_${userId}`, "true");
        setShouldShowTutorial(false);
      } else {
        // Check if this is first login (no tutorial reminder notification exists)
        const { data: reminderExists } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("notification_type", "tutorial_reminder")
          .single();

        // Show tutorial only if no reminder exists (first time) and not watched
        setShouldShowTutorial(!reminderExists && !hasWatched);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error checking tutorial status:", error);
      setIsLoading(false);
    }
  };

  const markAsWatched = async () => {
    if (!userId) return;

    try {
      localStorage.setItem(`tutorial_watched_${userId}`, "true");
      
      // Mark any tutorial reminder notifications as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("notification_type", "tutorial_reminder");

      setShouldShowTutorial(false);
    } catch (error) {
      console.error("Error marking tutorial as watched:", error);
    }
  };

  const showTutorial = () => {
    setShouldShowTutorial(true);
  };

  return {
    shouldShowTutorial,
    isLoading,
    markAsWatched,
    showTutorial,
  };
};
