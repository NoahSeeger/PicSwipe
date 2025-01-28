import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/components/ThemeProvider";

export function LoadingScreen() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Lade...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    opacity: 0.8,
  },
});
