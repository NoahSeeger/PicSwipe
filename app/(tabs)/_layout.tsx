import { Tabs } from "expo-router";
import { IconSymbol } from "../../components/ui/IconSymbol";
import { useTheme } from "@/components/ThemeProvider";
import { useI18n } from "@/hooks/useI18n";

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n('common');

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
          title: t('navigation.home'),
          tabBarIcon: ({ color }) => (
            <IconSymbol name="photo.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cleanup"
        options={{
          title: t('navigation.cleanup'),
          tabBarIcon: ({ color }) => (
            <IconSymbol name="paintbrush.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: t('navigation.albums'),
          tabBarIcon: ({ color }) => (
            <IconSymbol name="rectangle.stack.fill" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarIcon: ({ color }) => (
            <IconSymbol name="gear" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
