import { Tabs } from "expo-router";
import { IconSymbol } from "../../components/ui/IconSymbol";
import { useTheme } from "@/components/ThemeProvider";

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Fotos",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="photo.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cleanup"
        options={{
          title: "Bereinigung",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="paintbrush.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: "Alben",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="rectangle.stack.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Einstellungen",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="gear" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
