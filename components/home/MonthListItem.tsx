import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { ThemedText } from "../ThemedText";
import { IconSymbol } from "../ui/IconSymbol";
import { router } from "expo-router";

type Props = {
  month: string;
  year: number;
  photoCount: number;
  isProcessed: boolean;
  monthIndex: number;
};

export const MonthListItem = ({
  month,
  year,
  photoCount,
  isProcessed,
  monthIndex,
}: Props) => {
  const handlePress = () => {
    router.push({
      pathname: "/(tabs)/cleanup",
      params: { year, month: monthIndex },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <View style={styles.leftContent}>
        <ThemedText style={styles.monthYear}>
          {month} {year}
        </ThemedText>
        <ThemedText style={styles.stats}>
          {photoCount} Foto{photoCount !== 1 ? "s" : ""}
        </ThemedText>
      </View>

      <View style={styles.rightContent}>
        {isProcessed ? (
          <IconSymbol name="checkmark.circle.fill" size={24} color="#34C759" />
        ) : (
          <IconSymbol name="chevron.right" size={24} color="#007AFF" />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    marginLeft: 16,
  },
  monthYear: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  stats: {
    fontSize: 15,
    opacity: 0.6,
  },
});
