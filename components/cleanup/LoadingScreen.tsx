import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/components/ThemeProvider";

type LoadingScreenProps = {
  progress?: { current: number; total: number };
};

export function LoadingScreen({ progress }: LoadingScreenProps) {
  const { colors } = useTheme();

  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <View style={styles.textContainer}>
        <Text style={[styles.text, { color: colors.text }]}>Lade Fotos...</Text>
        {progress && progress.total > 0 && (
          <Text style={[styles.progressText, { color: colors.secondary }]}>
            {progress.current} von {progress.total} ({percentage}%)
          </Text>
        )}
      </View>
      {progress && progress.total > 0 && (
        <View
          style={[
            styles.progressBarContainer,
            { backgroundColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.primary,
                width: `${percentage}%`,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  textContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
  },
  progressBarContainer: {
    width: "80%",
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
});
