import React from "react";
import { StyleSheet, View, Pressable, Text, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { useI18n, useDateFormat } from "@/hooks/useI18n";

type Props = {
  month: string;
  year: number;
  photoCount: number;
  isProcessed: boolean;
  monthIndex: number;
  thumbnailUri?: string;
};

export function MonthListItem({
  month,
  year,
  photoCount,
  isProcessed,
  monthIndex,
  thumbnailUri,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n('home');
  const { getMonthName } = useDateFormat();

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      padding: 12,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: colors.card,
      marginBottom: 0, // FlatList gap regelt Abstand
    },
    thumbnail: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    textContainer: {
      marginLeft: 12,
      flex: 1,
      justifyContent: 'center',
    },
    month: {
      fontSize: 17,
      fontWeight: "600",
      marginBottom: 4,
      color: colors.text,
    },
    stats: {
      fontSize: 15,
      color: colors.secondary,
    },
    chevron: {
      marginLeft: 8,
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
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.7 }]}
      onPress={handlePress}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnail} />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.month} numberOfLines={1}>
          {getMonthName(monthIndex)} {year}
        </Text>
        <Text style={styles.stats} numberOfLines={1}>
          {t('monthsView.photosCount', { count: photoCount })}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={24}
        color={colors.secondary}
        style={styles.chevron}
        accessibilityLabel="Details anzeigen"
      />
    </Pressable>
  );
}
