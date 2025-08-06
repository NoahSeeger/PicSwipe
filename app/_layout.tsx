import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StatusBar } from "expo-status-bar";
import { Appearance } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const value = await AsyncStorage.getItem("hasLaunched");
        if (value === null) {
          await AsyncStorage.setItem("hasLaunched", "true");
          setIsFirstLaunch(true);
          router.replace("/onboarding");
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.error("Error checking first launch:", error);
      }
    };

    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    if (Platform.OS === "ios") {
      Purchases.configure({ apiKey: "appl_AfqyHTRArOyTHiRDAvgWKmWqTWM" });
    } else if (Platform.OS === "android") {
      Purchases.configure({ apiKey: "appl_AfqyHTRArOyTHiRDAvgWKmWqTWM" });
      // Optional: falls du Amazon Support aktivieren willst
      // Purchases.configure({ apiKey: "<revenuecat_project_amazon_api_key>", useAmazon: true });
    }

    checkFirstLaunch();
  }, []);

  return (
    <ThemeProvider>
      <StatusBar
        style={Appearance.getColorScheme() === "dark" ? "light" : "dark"}
      />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              animationDuration: 200,
              presentation: "card",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="year" />
            <Stack.Screen
              name="onboarding"
              options={{
                gestureEnabled: false,
                animation: "fade",
              }}
            />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
