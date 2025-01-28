import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/components/ThemeProvider";

type Props = {
  year: number;
  months: Array<{ month: number }>;
  totalPhotos: number;
  onPress: () => void;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export function YearListItem({ year, months, totalPhotos, onPress }: Props) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    year: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    totalPhotos: {
      fontSize: 16,
      color: colors.secondary,
    },
    monthsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    monthBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    monthText: {
      color: "#FFFFFF",
      fontSize: 12,
    },
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.year}>{year}</Text>
        <Text style={styles.totalPhotos}>
          {totalPhotos.toLocaleString()} Fotos
        </Text>
      </View>
      <View style={styles.monthsContainer}>
        {months.map((month) => (
          <View key={month.month} style={styles.monthBadge}>
            <Text style={styles.monthText}>
              {MONTH_NAMES[month.month - 1] || ""}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
