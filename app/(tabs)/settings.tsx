import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SWIPE_LIMIT, useSwipeLimit } from "@/hooks/useSwipeLimit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ThemeProvider";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { loadSwipes } = useSwipeLimit();

  const reachSwipeLimit = async () => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem("swipe_date", today);
      await AsyncStorage.setItem("swipe_count", SWIPE_LIMIT.toString());
      await loadSwipes();
      Alert.alert(
        "Swipes erreicht",
        `Du hast jetzt das Tageslimit von ${SWIPE_LIMIT} Swipes erreicht. Die Paywall sollte nun erscheinen, wenn du weiter swipest.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Fehler", "Konnte Swipes nicht setzen");
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingTop: insets.top,
      backgroundColor: colors.background,
    },
    section: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 15,
      color: colors.text,
    },
    devOptions: {
      gap: 10,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      color: "#FFFFFF",
      textAlign: "center",
    },
    buttonDisabled: {
      backgroundColor: colors.secondary,
      opacity: 0.5,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entwickleroptionen</Text>
        <View style={styles.devOptions}>
          {/* <Text style={styles.button} onPress={resetOnboarding}>
            Onboarding zurücksetzen
          </Text> */}
          <Text style={styles.button} onPress={reachSwipeLimit}>
            Swipes-Limit für Paywall-Test erreichen
          </Text>
        </View>
      </View>
    </View>
  );
}
