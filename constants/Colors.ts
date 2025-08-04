/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

export const colors = {
  light: {
    primary: "#007AFF",
    background: "#FFFFFF",
    text: "#000000",
    secondary: "#666666",
    card: "#F2F2F7",
    border: "#E5E5EA",
    tabBar: "#FFFFFF",
    shadow: "#000000",
  },
  dark: {
    primary: "#0A84FF",
    background: "#121214",
    text: "#FFFFFF",
    secondary: "#EBEBF5",
    card: "#1C1C1E",
    border: "#38383A",
    tabBar: "#121214",
    shadow: "#AFAFAF",
  },
} as const;

// Hook für einfachen Zugriff auf aktuelle Farben
import { useColorScheme } from "react-native";

export function useColors() {
  const scheme = useColorScheme();
  return colors[scheme ?? "light"];
}

export type ThemeColors = typeof colors.light;
