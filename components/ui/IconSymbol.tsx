// This file is a fallback for using MaterialIcons on Android and web.

import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const IconSymbol = ({ name, size, color }) => {
  // Füge Android-spezifische Icon-Namen hinzu
  const iconName = Platform.select({
    ios: name,
    android: name.replace("ios-", "md-"),
  });

  return <Ionicons name={iconName} size={size} color={color} />;
};
