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
          position: "absolute",
          bottom: 0,
          left: 20,
          right: 20,
          elevation: 5, // Android shadow
          backgroundColor: colors.tabBar,
          borderRadius: 20,
          height: 80,
          borderTopWidth: 0, // kein klassischer Border oben
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
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
