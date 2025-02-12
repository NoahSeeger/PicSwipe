// This file is a fallback for using MaterialIcons on Android and web.

import { Platform, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  name: string;
  size: number;
  color: string;
};

// Mapping von SF Symbols zu Ionicons Namen
const iconMapping: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  // Navigation & Tabs
  "house.fill": "home",
  "photo.fill": "images",
  gear: "settings",

  // Arrows & Navigation
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "chevron.left": "chevron-back",
  "chevron.right": "chevron-forward",

  // Actions
  "trash.fill": "trash",
  trash: "trash-outline",
  "arrow.uturn.backward": "arrow-undo",
  "square.and.arrow.down": "save-outline",

  // Status Icons
  "checkmark.circle": "checkmark-circle-outline",
  "checkmark.circle.fill": "checkmark-circle",

  // Close/Cancel
  xmark: "close",
  "xmark.circle.fill": "close-circle",

  // Keep Overlay Icons (für cleanup)
  keep: "bookmark",
  "keep.fill": "bookmark",
};

export function IconSymbol({ name, size, color }: Props) {
  if (Platform.OS === "ios") {
    // iOS verwendet SF Symbols
    return (
      <Text style={{ fontFamily: "SF Pro Display", fontSize: size, color }}>
        {name}
      </Text>
    );
  } else {
    // Android verwendet Ionicons
    const ionIconName = iconMapping[name] || "help-circle";
    return <Ionicons name={ionIconName} size={size} color={color} />;
  }
}
