import { Onboarding } from "../components/Onboarding";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../hooks/useOnboarding";

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();

  const handleOnboardingComplete = async () => {
    await completeOnboarding();
    router.replace("/(tabs)");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Onboarding onComplete={handleOnboardingComplete} />
    </View>
  );
}
