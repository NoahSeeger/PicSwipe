import { Platform } from "react-native";
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
import { configureRevenueCat } from "@/constants/RevenueCatConfig";
import '@/i18n';

// RevenueCat SOFORT konfigurieren, bevor React-Komponenten geladen werden
configureRevenueCat();

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
