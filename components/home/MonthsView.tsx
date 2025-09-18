import React from "react";
import { StyleSheet, View, FlatList, Pressable, Animated } from "react-native";
import { Text } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import { MonthListItem } from "./MonthListItem";
import { MonthListSkeleton } from "./MonthListSkeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { useMonthThumbnails } from "@/hooks/useMonthThumbnails";
import { useI18n } from "@/hooks/useI18n";
import { useProgress } from "@/hooks/useProgress";
import { useFocusEffect } from "@react-navigation/native";

type Props = {
  year: number;
  onClose: () => void;
};

export function MonthsView({ year, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n('home');
  const { months, isLoading, loadingState, progress } = useMonthThumbnails(year);
  const { refreshProgress } = useProgress();
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  // Refresh progress when returning to this view
  useFocusEffect(
    React.useCallback(() => {
      refreshProgress();
      setRefreshKey(prev => prev + 1);
    }, [refreshProgress])
  );
  
  // Animation für den Fortschrittsbalken
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

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
    progressContainer: {
      height: 2,
      backgroundColor: colors.border,
      borderRadius: 2,
      width: '100%',
      marginTop: 10,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    loadingStateText: {
      color: colors.text,
      opacity: 0.6,
      fontSize: 16,
      marginTop: 10,
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
          <Text style={styles.backText}>{t('monthsView.backButton')}</Text>
        </Pressable>
        <Text style={styles.title}>{year}</Text>
      </View>

      {/* Fortschrittsbalken unter dem Titel, wenn geladen wird */}
      {isLoading && (
        <View style={styles.progressContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                })
              }
            ]} 
          />
        </View>
      )}

      <FlatList
        data={months}
        renderItem={({ item }) => (
          <MonthListItem
            key={`${item.month}-${refreshKey}`}
            month={item.month}
            year={year}
            photoCount={item.photoCount}
            isProcessed={false}
            monthIndex={item.monthIndex}
            thumbnailUri={item.thumbnailUri}
          />
        )}
        keyExtractor={item => item.month}
        ListEmptyComponent={
          isLoading ? (
            // Während des Ladens zeigen wir Skeletons
            <View style={styles.list}>
              <MonthListSkeleton count={8} />
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text style={styles.loadingStateText}>
                  {(() => {
                    // Mache den Ladetext etwas ausführlicher
                    switch(loadingState) {
                      case 'initial': return 'Initialisiere...';
                      case 'loading-photos': return 'Lade Fotos für das Jahr ' + year + '...';
                      case 'processing-months': return 'Verarbeite Monate für ' + year + '...';
                      case 'loading-thumbnails': return 'Lade Vorschaubilder...';
                      case 'complete': return 'Abgeschlossen';
                      default: return 'Laden...';
                    }
                  })()}
                </Text>
              </View>
            </View>
          ) : (
            // Keine Monate gefunden
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: colors.text }}>
                Keine Fotos für das Jahr {year} gefunden.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          // Zeige Skeletons als Platzhalter für noch kommende Daten
          isLoading && months.length > 0 ? (
            <>
              <MonthListSkeleton count={3} />
              <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 16 }}>
                <Text style={styles.loadingStateText}>
                  {(() => {
                    // Mehr Details im Ladetext
                    switch(loadingState) {
                      case 'loading-photos': return 'Lade weitere Fotos für ' + year + '...';
                      case 'processing-months': return 'Verarbeite weitere Monate für ' + year + '...';
                      case 'loading-thumbnails': return 'Lade Vorschaubilder (' + Math.round(progress) + '%)...';
                      default: return 'Laden...';
                    }
                  })()}
                </Text>
              </View>
            </>
          ) : null
        }
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
      />
    </View>
  );
}
