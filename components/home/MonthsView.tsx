import React from "react";
import { StyleSheet, View, FlatList, Pressable } from "react-native";
import { Text } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import { MonthListItem } from "./MonthListItem";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { useMonthThumbnails } from "@/hooks/useMonthThumbnails";

type Props = {
  year: number;
  onClose: () => void;
};

export function MonthsView({ year, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { months, isLoading } = useMonthThumbnails(year);

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
    list: {
      padding: 16,
      gap: 12,
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
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: colors.secondary, fontSize: 16 }}>Lade Monate...</Text>
        </View>
      ) : (
        <FlatList
          data={months}
          renderItem={({ item }) => (
            <MonthListItem
              key={item.month}
              month={item.month}
              year={year}
              photoCount={item.photoCount}
              isProcessed={false}
              monthIndex={item.monthIndex}
              thumbnailUri={item.thumbnailUri}
            />
          )}
          keyExtractor={item => item.month}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        />
      )}
    </View>
  );
}
