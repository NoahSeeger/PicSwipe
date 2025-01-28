import React from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import { router } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";

type Props = {
  month: string;
  year: number;
  photoCount: number;
  isProcessed: boolean;
  monthIndex: number;
};

export function MonthListItem({
  month,
  year,
  photoCount,
  isProcessed,
  monthIndex,
}: Props) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pressed: {
      opacity: 0.7,
      backgroundColor: colors.pressed,
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
      color: colors.text,
    },
    stats: {
      fontSize: 15,
      color: colors.secondary,
    },
  });

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
        <Text style={styles.monthYear}>
          {month} {year}
        </Text>
        <Text style={styles.stats}>
          {photoCount} Foto{photoCount !== 1 ? "s" : ""}
        </Text>
      </View>

      <View style={styles.rightContent}>
        {isProcessed ? (
          <IconSymbol name="checkmark.circle.fill" size={24} color="#34C759" />
        ) : (
          <IconSymbol name="chevron.right" size={24} color={colors.primary} />
        )}
      </View>
    </Pressable>
  );
}
