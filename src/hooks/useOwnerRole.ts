import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useOwnerRole = (userId: string | null) => {
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    checkOwnerRole();
  }, [userId]);

  const checkOwnerRole = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "owner")
        .maybeSingle();

      if (error) throw error;

      setIsOwner(!!data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking owner role:", error);
      setIsLoading(false);
    }
  };

  return {
    isOwner,
    isLoading,
    refetch: checkOwnerRole,
  };
};
