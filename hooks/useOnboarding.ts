import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";

export const ONBOARDING_COMPLETE_KEY = "@onboarding_complete";

export const useOnboarding = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [mediaPermission, setMediaPermission] =
    useState<MediaLibrary.PermissionStatus | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const requestMediaPermission = async () => {
    // Nur Status abfragen; tatsächliche Anforderung erfolgt über PermissionGuard
    const { status } = await MediaLibrary.getPermissionsAsync();
    setMediaPermission(status);
    return status;
  };

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      setHasCompletedOnboarding(value === "true");
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  return {
    isLoading,
    hasCompletedOnboarding,
    completeOnboarding,
    mediaPermission,
    requestMediaPermission,
  };
};
