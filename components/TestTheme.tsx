import { Text, StyleSheet, View, useColorScheme, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

export function TestTheme() {
  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        styles.container,
        colorScheme === "light" ? styles.lightContainer : styles.darkContainer,
      ]}
    >
      <Text
        style={colorScheme === "light" ? styles.lightText : styles.darkText}
      >
        Current theme: {colorScheme}
        {"\n"}
        Platform: {Platform.OS}
        {"\n"}
        Version: {Platform.Version}
      </Text>
      <StatusBar style={colorScheme === "light" ? "dark" : "light"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lightContainer: {
    backgroundColor: "#FFFFFF",
  },
  darkContainer: {
    backgroundColor: "#121214",
  },
  lightText: {
    color: "#000000",
  },
  darkText: {
    color: "#FFFFFF",
  },
});
