import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/components/ThemeProvider";

type LoadingScreenProps = {
  progress: {
    current: number;
    total: number;
  };
  message?: string;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  message = "Lade Fotos...",
}) => {
  const { colors } = useTheme();

  const progressPercentage =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: 20,
    },
    loadingText: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 20,
      textAlign: "center",
    },
    progressContainer: {
      width: "80%",
      alignItems: "center",
      marginBottom: 30,
    },
    progressBar: {
      width: "100%",
      height: 8,
      backgroundColor: colors.border || "#E5E5E5",
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 10,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 4,
      minWidth: 2, // Mindestbreite für Sichtbarkeit
    },
    progressText: {
      fontSize: 14,
      color: colors.textSecondary || colors.text,
      marginBottom: 10,
    },
    countText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
    spinner: {
      marginTop: 20,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>{message}</Text>

      <View style={styles.progressContainer}>
        {progress.total > 0 && (
          <>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>

            <Text style={styles.progressText}>
              {progressPercentage}% abgeschlossen
            </Text>

            <Text style={styles.countText}>
              {progress.current} von {progress.total} Fotos
            </Text>
          </>
        )}
      </View>

      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.spinner}
      />
    </View>
  );
};
