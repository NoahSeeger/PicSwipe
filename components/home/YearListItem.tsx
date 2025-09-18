import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "@/components/ThemeProvider";
import { useI18n } from "@/hooks/useI18n";
import { useProgress } from "@/hooks/useProgress";

type Props = {
  year: number;
  months: Array<{ month: number }>;
  totalPhotos: number;
  onPress: () => void;
  thumbnailUri?: string;
};



export function YearListItem({ year, months, totalPhotos, onPress, thumbnailUri }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n('common');
  const { getYearProgress } = useProgress();
  const [monthsProgress, setMonthsProgress] = useState<boolean[]>(new Array(12).fill(false));

  // Get available months (months that have photos)
  const availableMonths = months.map(m => m.month - 1); // Convert to 0-based index
  const totalAvailableMonths = availableMonths.length;

  useEffect(() => {
    const loadProgress = async () => {
      const progress = await getYearProgress(year);
      setMonthsProgress(progress);
    };
    loadProgress();
  }, [year, getYearProgress]);

  // Progress Bar Component
  const ProgressBar = () => {
    // Only count completed months that actually have photos
    const completedAvailableCount = availableMonths.filter(monthIndex => 
      monthsProgress[monthIndex]
    ).length;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {availableMonths.map((monthIndex) => (
            <View
              key={monthIndex}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: monthsProgress[monthIndex] ? colors.primary : colors.border,
                }
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>
          {t('common.monthsProgressText', { 
            completed: completedAvailableCount, 
            total: totalAvailableMonths 
          })}
        </Text>
      </View>
    );
  };

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
    progressContainer: {
      marginTop: 8,
    },
    progressBar: {
      flexDirection: 'row',
      height: 4,
      borderRadius: 2,
      gap: 1,
    },
    progressSegment: {
      flex: 1,
      height: '100%',
      borderRadius: 1,
    },
    progressText: {
      fontSize: 12,
      color: colors.secondary,
      marginTop: 4,
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
          {t('common.photoCount', { count: totalPhotos })}
        </Text>
        <ProgressBar />
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
