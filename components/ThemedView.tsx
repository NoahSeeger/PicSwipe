import { View, type ViewProps, Platform, StyleSheet } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        // iOS spezifische Styles
      },
      android: {
        // Android spezifische Styles
        elevation: 4, // Für Android Schatten
      },
    }),
  },
});

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background"
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
