import React from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  RefreshControl,
  Text,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useYearThumbnails, type YearLoadingState } from "@/hooks/useYearThumbnails";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YearListItem } from "@/components/home/YearListItem";
import { YearListSkeleton } from "@/components/home/YearListSkeleton";
import { router } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { useI18n } from "@/hooks/useI18n";
import { useProgress } from "@/hooks/useProgress";
import { useFocusEffect } from "@react-navigation/native";

export default function HomeScreen() {
  const { years, isLoading, loadingState, progress, refreshData } = useYearThumbnails();
  const insets = useSafeAreaInsets();
  const totalPhotos = years.reduce((sum, year) => sum + year.totalPhotos, 0);
  const { colors, isDark } = useTheme();
  const { t } = useI18n('home');
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

  // Permissions werden zentral über PermissionGuard gehandhabt

  const handleYearPress = (year: number) => {
    router.push({
      pathname: "/[year]",
      params: { year: year.toString() },
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    },
    loadingText: {
      fontSize: 16,
      opacity: 0.8,
      color: colors.text,
    },
    progressContainer: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      width: '70%',
      marginTop: 10,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    loadingStateText: {
      fontSize: 14,
      color: colors.text,
      opacity: 0.6,
      marginTop: 5,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      marginBottom: 20,
      paddingTop: 4,
    },
    title: {
      fontSize: 34,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
      includeFontPadding: false,
      lineHeight: 41,
    },
    subtitle: {
      fontSize: 17,
      opacity: 0.6,
      color: colors.text,
    },
    listContainer: {
      paddingHorizontal: 16,
      gap: 12,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* Nur den Ladescreen anzeigen, wenn wir im initialen Ladezustand sind und keine Daten haben */}
      {isLoading && loadingState === 'initial' && years.length === 0 ? (
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 8 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('loading.photos')}</Text>
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
          <Text style={styles.loadingStateText}>
            {loadingState === 'initial' ? t('loading.initial') :
             loadingState === 'loading-photos' ? t('loading.photos') :
             loadingState === 'processing-years' ? t('loading.processing') :
             loadingState === 'loading-thumbnails' ? t('loading.thumbnails') :
             loadingState === 'complete' ? t('loading.complete') : t('loading.general')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 80, // Tab bar height
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshData}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('title')}</Text>
            <Text style={styles.subtitle}>
              {isLoading && loadingState !== 'complete' ? (
                /* @ts-ignore - Type-Fehler hier ignorieren */
                loadingState === 'loading-photos' ? t('loading.photos') :
                loadingState === 'processing-years' ? t('loading.processing') :
                loadingState === 'loading-thumbnails' ? t('loading.thumbnails') :
                t('loading.general')
              ) : (
                t('totalPhotos', { count: totalPhotos })
              )}
            </Text>
            
            {/* Fortschrittsbalken während des Ladens anzeigen */}
            {isLoading && loadingState !== 'initial' && (
              <View style={[styles.progressContainer, {marginTop: 10, width: '100%', height: 2}]}>
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
          </View>

          <View style={styles.listContainer}>
            {/* Wenn keine Daten geladen sind aber Ladevorgang läuft, zeige Skeleton */}
            {years.length === 0 ? (
              /* Zeige Skeleton-Ladeanzeige während der Ladezeit */
              <YearListSkeleton count={8} />
            ) : (
              /* Zeige geladene Daten an */
              <>
                {years.map((year) => (
                  <YearListItem
                    key={`${year.year}-${refreshKey}`}
                    year={year.year}
                    months={year.months.map((m) => ({ month: m.month }))}
                    totalPhotos={year.totalPhotos}
                    thumbnailUri={year.thumbnailUri}
                    onPress={() => handleYearPress(year.year)}
                  />
                ))}
                
                {/* Zeige Skeletons als Platzhalter für noch kommende Daten */}
                {isLoading && loadingState !== 'complete' && (
                  <YearListSkeleton count={3} />
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
