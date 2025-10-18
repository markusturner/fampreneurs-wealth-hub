import { useState, useEffect } from 'react';

export const useGovernanceOnboarding = (userId: string | null) => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const checkOnboardingStatus = () => {
      try {
        const completed = localStorage.getItem(`governance_onboarding_complete_${userId}`);
        const hasData = localStorage.getItem(`governance_onboarding_${userId}`);
        
        // Don't auto-show onboarding - only show when manually triggered
        setShouldShowOnboarding(false);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [userId]);

  const completeOnboarding = () => {
    setShouldShowOnboarding(false);
  };

  const openOnboarding = () => {
    setShouldShowOnboarding(true);
  };

  const resetOnboarding = () => {
    if (userId) {
      localStorage.removeItem(`governance_onboarding_complete_${userId}`);
      localStorage.removeItem(`governance_onboarding_${userId}`);
      setShouldShowOnboarding(true);
    }
  };

  return {
    shouldShowOnboarding,
    isLoading,
    completeOnboarding,
    openOnboarding,
    resetOnboarding
  };
};