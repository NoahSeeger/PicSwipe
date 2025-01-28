import React from "react";
import { useColorScheme, Platform } from "react-native";
import { colors } from "@/constants/Colors";

// Definiere den Kontext-Typ
type ThemeContextType = {
  colors: typeof colors.light;
  isDark: boolean;
};

// Erstelle den Kontext mit Default-Werten
export const ThemeContext = React.createContext<ThemeContextType>({
  colors: colors.light,
  isDark: false,
});

// Der ThemeProvider-Wrapper
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme(); // Erkennt System-Theme
  const isDark = colorScheme === "dark";

  // Debug-Logs hinzufügen
  React.useEffect(() => {
    console.log("🎨 Theme changed:", {
      theme: colorScheme,
      platform: Platform.OS,
      version: Platform.Version,
      timestamp: new Date().toISOString(),
    });
  }, [colorScheme]);

  // Stelle Theme-Werte bereit
  const value = {
    colors: colors[isDark ? "dark" : "light"],
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Hook für einfachen Zugriff
export function useTheme() {
  return React.useContext(ThemeContext);
}
