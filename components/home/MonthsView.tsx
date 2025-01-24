import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { ThemedView } from "../ThemedView";
import { ThemedText } from "../ThemedText";
import { IconSymbol } from "../ui/IconSymbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

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

export const MonthsView = ({ year, months, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header]}>
        <Pressable
          onPress={onClose}
          style={[styles.backButton, { marginTop: insets.top }]}
        >
          <IconSymbol name="chevron.left" size={28} color="#007AFF" />
          <ThemedText style={styles.backText}>Übersicht</ThemedText>
        </Pressable>
        <ThemedText style={[styles.title, { includeFontPadding: false }]}>
          {year}
        </ThemedText>
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
              <ThemedText style={styles.monthName}>{month.month}</ThemedText>
              <ThemedText style={styles.photoCount}>
                {month.photoCount} Elemente
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color="#666" />
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
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
    color: "#007AFF",
    marginLeft: -4,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#fff",
    lineHeight: 41,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  monthItem: {
    backgroundColor: "#1C1C1E",
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
