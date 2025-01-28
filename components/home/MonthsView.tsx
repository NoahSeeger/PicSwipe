import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { Text } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";

type MonthData = {
  month: string;
  photoCount: number;
  monthIndex: number;
};

type Props = {
  year: number;
  months: MonthData[];
  onClose: () => void;
};

export function MonthsView({ year, months, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    backText: {
      fontSize: 17,
      color: colors.primary,
      marginLeft: -4,
    },
    title: {
      fontSize: 34,
      fontWeight: "bold",
      color: colors.text,
      lineHeight: 41,
      includeFontPadding: false,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    monthItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 8,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    monthContainer: {
      flex: 1,
    },
    monthName: {
      fontSize: 17,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    photoCount: {
      fontSize: 15,
      color: colors.secondary,
    },
    pressed: {
      opacity: 0.7,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={[styles.backButton, { marginTop: insets.top }]}
        >
          <IconSymbol name="chevron.left" size={28} color={colors.primary} />
          <Text style={styles.backText}>Übersicht</Text>
        </Pressable>
        <Text style={styles.title}>{year}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
        }}
      >
        {months.map((month) => (
          <Pressable
            key={month.month}
            style={({ pressed }) => [
              styles.monthItem,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              router.push({
                pathname: "/(tabs)/cleanup",
                params: { year, month: month.monthIndex },
              });
            }}
          >
            <View style={styles.monthContainer}>
              <Text style={styles.monthName}>{month.month}</Text>
              <Text style={styles.photoCount}>{month.photoCount} Elemente</Text>
            </View>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={colors.secondary}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
