import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router';
import { Platform, AccessibilityInfo, DynamicColorIOS } from 'react-native';
import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/components/ThemeProvider';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Abwärtskompatible TabBar für ältere iOS-Versionen oder wenn Liquid Glass nicht verfügbar
function LegacyTabLayout() {
  const { t } = useI18n('common');
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

// Moderne NativeTabs für iOS 15+
function ModernTabLayout() {
  const { t } = useI18n('common');
  const { colors } = useTheme();

  return (
    <NativeTabs
      tintColor={colors.primary} // Verwende Theme-Farbe für blaue Icons/Text
    >
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "photo", selected: "photo.fill" }} />
        <Label>{t('navigation.home')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cleanup">
        <Icon sf={{ default: "paintbrush", selected: "paintbrush.fill" }} />
        <Label>{t('navigation.cleanup')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="albums">
        <Icon sf={{ default: "rectangle.stack", selected: "rectangle.stack.fill" }} />
        <Label>{t('navigation.albums')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gear", selected: "gear" }} />
        <Label>{t('navigation.settings')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabLayout() {
  // Prüfe Liquid Glass Verfügbarkeit - nur für iOS 26+
  const supportsLiquidGlass = React.useCallback(async () => {
    // Prüfe iOS-Version für echte Liquid Glass Unterstützung (iOS 26+)
    if (Platform.OS !== 'ios') {
      return false;
    }
    
    const iOSVersion = parseInt(Platform.Version, 10);
    console.log('iOS Version detected:', iOSVersion);
    
    // Nur iOS 26+ unterstützt echtes Liquid Glass
    if (iOSVersion < 26) {
      console.log('iOS version too old for Liquid Glass, using Legacy');
      return false;
    }

    // Prüfe Accessibility-Einstellungen (Reduce Transparency)
    try {
      const reduceTransparency = await AccessibilityInfo.isReduceTransparencyEnabled();
      const glassSupported = !reduceTransparency;
      console.log('Reduce transparency enabled:', reduceTransparency, 'Glass supported:', glassSupported);
      return glassSupported;
    } catch (error) {
      // Bei Fehler: Fallback auf Legacy für Sicherheit
      console.log('Accessibility check failed, using Legacy as fallback');
      return false;
    }
  }, []);

  // State für Liquid Glass Unterstützung
  const [liquidGlassSupported, setLiquidGlassSupported] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const checkLiquidGlass = async () => {
      try {
        const supported = await supportsLiquidGlass();
        console.log('Liquid Glass check result:', supported);
        if (isMounted) {
          setLiquidGlassSupported(supported);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking Liquid Glass support:', error);
        if (isMounted) {
          setLiquidGlassSupported(false); // Fallback auf Legacy
          setIsLoading(false);
        }
      }
    };

    checkLiquidGlass();

    return () => {
      isMounted = false;
    };
  }, [supportsLiquidGlass]);

  // Zeige Loading-State während der Prüfung
  if (isLoading) {
    return <LegacyTabLayout />; // Sofortiger Fallback während des Ladens
  }

  console.log('Rendering TabLayout - liquidGlassSupported:', liquidGlassSupported);

  if (liquidGlassSupported) {
    console.log('Using ModernTabLayout (Liquid Glass)');
    return <ModernTabLayout />;
  } else {
    console.log('Using LegacyTabLayout (Custom Design)');
    return <LegacyTabLayout />;
  }
}
// ...
