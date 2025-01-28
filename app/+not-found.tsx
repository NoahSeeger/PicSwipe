import { Link, Stack } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import { useTheme } from "@/components/ThemeProvider";

export default function NotFoundScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    link: {
      marginTop: 15,
      paddingVertical: 15,
      color: colors.primary,
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>
          Diese Seite konnte nicht gefunden werden.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.link}>Zurück zum Start</Text>
        </Link>
      </View>
    </>
  );
}
