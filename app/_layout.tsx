import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { StatusBar } from "expo-status-bar";
import { Appearance } from "react-native";
import { PermissionGuard } from "@/components/PermissionGuard";
import { PhotoPermissionProvider } from "@/components/PhotoPermissionProvider";

export default function RootLayout() {
  const router = useRouter();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const { colors } = useTheme();
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const value = await AsyncStorage.getItem("hasLaunched");
        if (value === null) {
          await AsyncStorage.setItem("hasLaunched", "true");
          setIsFirstLaunch(true);
          //router.replace("/onboarding"); //disable onboarding for now
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
          <PhotoPermissionProvider>
            <PermissionGuard customButtonText="Weiter">
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "slide_from_bottom",
                  animationDuration: 250,
                  presentation: "card",
                  contentStyle: {
                    backgroundColor:
                      Appearance.getColorScheme() === "dark"
                        ? "black"
                        : "white",
                  },
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="[year]" />
                <Stack.Screen
                  name="onboarding"
                  options={{
                    gestureEnabled: false,
                    animation: "fade",
                  }}
                />
              </Stack>
            </PermissionGuard>
          </PhotoPermissionProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
