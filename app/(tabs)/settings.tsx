import React from "react";
import { View, StyleSheet, Alert } from "react-native";
import { ThemedView } from "../../components/ThemedView";
import { ThemedText } from "../../components/ThemedText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePhotoPermission } from "../../hooks/usePhotoPermission";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { permissionStatus, requestPermission } = usePhotoPermission();
  const insets = useSafeAreaInsets();

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem("hasLaunched");
      Alert.alert(
        "Erfolg",
        "Onboarding wurde zurückgesetzt. Starte die App neu, um die Änderungen zu sehen.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Fehler", "Konnte Onboarding nicht zurücksetzen");
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Entwickleroptionen</ThemedText>
        <View style={styles.devOptions}>
          <ThemedText style={styles.button} onPress={resetOnboarding}>
            Onboarding zurücksetzen
          </ThemedText>
          <ThemedText
            style={[
              styles.button,
              permissionStatus === "granted" && styles.buttonDisabled,
            ]}
            onPress={requestPermission}
          >
            {permissionStatus === "granted"
              ? "Foto-Zugriff aktiv"
              : "Foto-Zugriff anfordern"}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#121214",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#FFFFFF",
  },
  devOptions: {
    gap: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    color: "white",
    textAlign: "center",
  },
  buttonDisabled: {
    backgroundColor: "#2A2A2C",
    color: "#808080",
  },
});
