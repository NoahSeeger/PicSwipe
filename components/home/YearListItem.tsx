import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { ThemedText } from "../ThemedText";
import { IconSymbol } from "../ui/IconSymbol";

type Props = {
  year: number;
  months: any[];
  totalPhotos: number;
  onPress: () => void;
};

export const YearListItem = ({ year, totalPhotos, onPress }: Props) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <ThemedText style={styles.monthName}>{year}</ThemedText>
        <ThemedText style={styles.photoCount}>
          {totalPhotos} Elemente
        </ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={20} color="#666" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
  },
  monthName: {
    fontSize: 17,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 4,
  },
  photoCount: {
    fontSize: 15,
    color: "#8E8E93",
  },
  pressed: {
    opacity: 0.7,
  },
});
