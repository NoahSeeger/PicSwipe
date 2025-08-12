import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "@/components/ThemeProvider";

type Props = {
  year: number;
  months: Array<{ month: number }>;
  totalPhotos: number;
  onPress: () => void;
  thumbnailUri?: string;
};



export function YearListItem({ year, months, totalPhotos, onPress, thumbnailUri }: Props) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    thumbnail: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 14,
      backgroundColor: colors.border,
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    year: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.text,
    },
    totalPhotos: {
      fontSize: 15,
      color: colors.secondary,
      marginTop: 2,
    },
    chevron: {
      marginLeft: 12,
    },
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnail} />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.year}>{year}</Text>
        <Text style={styles.totalPhotos}>
          {totalPhotos.toLocaleString()} Fotos
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
