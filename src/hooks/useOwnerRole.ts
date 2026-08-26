import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cachedRequest, clearRequestCache } from "@/lib/request-cache";

export const useOwnerRole = (userId: string | null) => {
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(!!userId);

  const checkOwnerRole = useCallback(
    async (force = false) => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        if (force) clearRequestCache(`owner-role:${userId}`);
        const owner = await cachedRequest(
          `owner-role:${userId}`,
          async () => {
            const { data, error } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", userId)
              .eq("role", "owner")
              .maybeSingle();
            if (error) throw error;
            return !!data;
          },
          10 * 60 * 1000,
        );
        setIsOwner(owner);
      } catch (error) {
        console.error("Error checking owner role:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    checkOwnerRole();
  }, [checkOwnerRole]);

  return {
    isOwner,
    isLoading,
    refetch: () => checkOwnerRole(true),
  };
};
