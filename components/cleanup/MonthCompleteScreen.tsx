import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { formatBytes } from "@/utils/formatBytes";
import { PhotoToDelete } from "@/hooks/usePhotoManager";
import { DeleteButton } from "./DeleteButton";
import { useI18n, useNumberFormat } from "@/hooks/useI18n";
import { useProgress } from "@/hooks/useProgress";

type MonthCompleteScreenProps = {
  month: string;
  year: number;
  photosToDelete: PhotoToDelete[];
  totalSize: number;
  onDelete: () => Promise<boolean>;
  onContinue: () => void;
  photos: PhotoToDelete[];
  onRemovePhoto: (id: string) => void;
  isLastMonth: boolean;
  nextMonthLabel?: string;
  uniqueMonthsCount?: number; // Neue Eigenschaft
};

export function MonthCompleteScreen({
  month,
  year,
  photosToDelete,
  totalSize,
  onDelete,
  onContinue,
  photos,
  onRemovePhoto,
  isLastMonth,
  nextMonthLabel,
  uniqueMonthsCount,
}: MonthCompleteScreenProps) {
  const { colors } = useTheme();
  const { t } = useI18n('cleanup');
  const { formatBytes } = useNumberFormat();
  const { markMonthCompleted } = useProgress();

  // Mark month as completed when this screen is shown
  React.useEffect(() => {
    const markCompleted = async () => {
      // We need to convert the month name back to index
      // This is not ideal - let's improve this by passing monthIndex directly
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      // Try to find month index - this is a fallback approach
      let monthIndex = monthNames.findIndex(name => name.toLowerCase() === month.toLowerCase());
      
      // If not found, try German month names
      if (monthIndex === -1) {
        const germanMonths = [
          'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
          'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];
        monthIndex = germanMonths.findIndex(name => name === month);
      }
      
      if (monthIndex !== -1) {
        // Calculate total photos processed (photos to delete + photos that were kept)
        const totalProcessed = photosToDelete.length + (photos.length - photosToDelete.length);
        
        await markMonthCompleted(
          year,
          monthIndex,
          totalProcessed, // Total photos processed
          photosToDelete.length // Photos to be deleted
        );
      } else {
        console.warn('Could not determine month index for:', month);
      }
    };

    markCompleted();
  }, [month, year, photosToDelete.length, photos.length, markMonthCompleted]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <IconSymbol
          name="checkmark.circle.fill"
          size={64}
          color={colors.primary}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          {t('monthComplete.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          {t('monthComplete.subtitle', { month, year })}
        </Text>

        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {photosToDelete.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>
              {(uniqueMonthsCount && uniqueMonthsCount > 1)
                ? t('monthComplete.stats.photosFromMonths', { count: uniqueMonthsCount })
                : t('monthComplete.stats.photosToDelete')
              }
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatBytes(totalSize)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>
              {t('monthComplete.stats.storageSpace')}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <DeleteButton
            onDelete={onDelete}
            photos={photos}
            onRemovePhoto={onRemovePhoto}
            totalSize={totalSize}
          />
          {!isLastMonth && (
            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.card, marginTop: 12 },
              ]}
              onPress={onContinue}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}> 
                {nextMonthLabel 
                  ? t('monthComplete.continueToNext', { nextMonth: nextMonthLabel })
                  : t('monthComplete.allMonthsComplete')
                }
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  statsContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  divider: {
    width: 1,
    marginHorizontal: 16,
  },
  buttonContainer: {
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
