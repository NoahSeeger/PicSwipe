import React, { useEffect, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { View, StyleSheet, Modal, Linking, Text } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ThemeProvider";
import { useRouter } from "expo-router";

// Hooks
import { usePhotoManager } from "@/hooks/usePhotoManager";
import { useSwipeLimit } from "@/hooks/useSwipeLimit";
import { useReviewPrompt } from "@/hooks/useReviewPrompt";
import { useI18n } from "@/hooks/useI18n";
import { useDateFormat } from "@/hooks/useI18n";
import { useProgress } from "@/hooks/useProgress";

// Components
import { HeaderControls } from "@/components/cleanup/HeaderControls";
import { SwipeablePhoto } from "@/components/cleanup/SwipeablePhoto";
import { FullscreenImage } from "@/components/FullscreenImage";
import { MonthCompleteScreen } from "@/components/cleanup/MonthCompleteScreen";
import { AlbumCompleteScreen } from "@/components/cleanup/AlbumCompleteScreen";
import { LoadingScreen } from "@/components/cleanup/LoadingScreen";

import { useLayoutEffect } from "react";

export default function CleanupScreen() {
  // State für das nächste Monats-Label
  const [nextMonthLabel, setNextMonthLabel] = useState<string | undefined>(undefined);
  
  // Hooks & State
  const { year, month, albumId } = useLocalSearchParams<{
    year: string;
    month: string;
    albumId: string;
  }>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useI18n('cleanup');
  const { getMonthName } = useDateFormat();

  // Deaktiviere Swipe-Back-Geste explizit für diesen Screen
  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      swipeEnabled: false,
    });
    
    // Zusätzlich: Deaktiviere die Geste für den gesamten Parent-Navigator
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        gestureEnabled: false,
        swipeEnabled: false,
      });
    }
    
    return () => {
      // Cleanup: Aktiviere die Gesten wieder beim Verlassen
      navigation.setOptions({
        gestureEnabled: true,
        swipeEnabled: true,
      });
      if (parent) {
        parent.setOptions({
          gestureEnabled: true,
          swipeEnabled: true,
        });
      }
    };
  }, [navigation]);

  const {
    currentPhoto,
    nextPhotos,
    photosToDelete,
    previousPhoto,
    moveToNextPhoto,
    handleUndo,
    deleteSelectedPhotos,
    progress,
    removeFromDeleteList,
    isMonthComplete,
    currentMonth,
    moveToNextMonth,
    isLoading,
    loadingProgress, // Jetzt mit verbesserter Struktur
    setInitialMonth,
    isLastMonth,
    currentAlbumTitle,
    getNextMonthLabel, // Neue Funktion
    uniqueMonthsCount, // Neue Eigenschaft für kumulative Löschungen
    isNextPhotoLoading, // 🔥 NEU: Zeigt ob nächstes Foto lädt
    prefetchNextMonth, // 🚀 NEU: Prefetch nächsten Monat
  } = usePhotoManager();

  const { swipes, incrementSwipe, hasReachedLimit, isPro, loadSwipes, refreshProStatus } = useSwipeLimit();
  const { isMonthCompleted } = useProgress();

  // Direktes Review-System: Nach 10 Swipes den nativen Prompt anzeigen
  useReviewPrompt(swipes);

  // Function to find the newest uncompleted month
  const findNewestUncompletedMonth = async (): Promise<{year: number, month: number}> => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Start from current month and go backwards
    for (let year = currentYear; year >= currentYear - 5; year--) { // Check last 5 years
      const maxMonth = year === currentYear ? currentMonth : 11;
      
      for (let month = maxMonth; month >= 0; month--) {
        const isCompleted = await isMonthCompleted(year, month);
        if (!isCompleted) {
          return { year, month };
        }
      }
    }

    // Fallback to current month if all are completed (shouldn't happen in practice)
    return { year: currentYear, month: currentMonth };
  };

  // Synchronisiere Swipes bei jedem Focus (z.B. nach Settings-Änderung)
  useFocusEffect(
    React.useCallback(() => {
      loadSwipes();
    }, [])
  );

  // Handle swipe with paywall logic
  const handleSwipeWithPaywall = async (direction: "left" | "right") => {
    if (hasReachedLimit) {
      console.log('[Paywall] Limit erreicht, Paywall würde jetzt angezeigt werden!');
      try {
        const result = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: "pro",
        });
        // result kann z.B. "PURCHASED", "RESTORED", "CANCELLED" sein
        if (result === "PURCHASED" || result === "RESTORED") {
          await refreshProStatus(); // Pro-Status sofort aktualisieren
          await incrementSwipe();
          moveToNextPhoto(direction === "left");
        }
      } catch (e: any) {
        const msg = typeof e === "object" && e && "message" in e ? (e as any).message : String(e);
        // Optional: Zeige einen Alert, wie im Settings-Button
        if (typeof window !== "undefined" && window.alert) {
          window.alert("Paywall konnte nicht angezeigt werden: " + msg);
        } else {
          console.log("Paywall konnte nicht angezeigt werden: " + msg);
        }
      }
    } else {
      await incrementSwipe();
      moveToNextPhoto(direction === "left");
    }
  };

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        // Optimierte Eager Loading-Konfiguration
        const eagerLoadCount = 5; // Lade 5 Bilder initial

        if (albumId) {
          await setInitialMonth(0, 0, albumId, eagerLoadCount);
        } else if (year && month) {
          await setInitialMonth(
            parseInt(year),
            parseInt(month),
            undefined,
            eagerLoadCount
          );
        } else {
          // Smart navigation: Go to newest uncompleted month
          const { year: targetYear, month: targetMonth } = await findNewestUncompletedMonth();
          await setInitialMonth(
            targetYear,
            targetMonth,
            undefined,
            eagerLoadCount
          );
        }
      } catch (error) {
        console.error("Error loading photos:", error);
      }
    };

    loadPhotos();
  }, [year, month, albumId, isMonthCompleted]);

  // Berechne das Label für den nächsten Monat nur wenn der Monat abgeschlossen ist
  useEffect(() => {
    if (isMonthComplete && !albumId && !isLastMonth) {
      getNextMonthLabel().then(label => setNextMonthLabel(label || undefined));
    } else {
      setNextMonthLabel(undefined);
    }
  }, [isMonthComplete, albumId, isLastMonth, getNextMonthLabel]);

  // Styles mit Theme-Farben
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    messageContainer: {
      padding: 20,
      alignItems: "center",
    },
    message: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 20,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      color: "#FFFFFF",
      textAlign: "center",
    },
    photoContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
  });

  // Hilfsfunktion für LoadingScreen Props
  const getLoadingScreenProps = () => {
    switch (loadingProgress.phase) {
      case "initial":
        return {
          progress: { current: 0, total: Math.max(loadingProgress.total, 1) },
          message: t('loading.searchingPhotos'),
        };
      case "loading":
        return {
          progress: {
            current: loadingProgress.current,
            total: Math.min(loadingProgress.priorityCount, loadingProgress.total),
          },
          message: t('loading.loadingFirst', { 
            count: Math.min(loadingProgress.priorityCount, loadingProgress.total) 
          }),
        };
      case "background":
        return {
          progress: {
            current: loadingProgress.priorityCount,
            total: loadingProgress.priorityCount,
          },
          message: t('loading.readyToSort'),
        };
      case "complete":
        return {
          progress: {
            current: loadingProgress.total,
            total: loadingProgress.total,
          },
          message: t('loading.allPhotosLoaded'),
        };
      default:
        return {
          progress: { current: 0, total: 1 },
          message: "Lade...",
        };
    }
  };

  // Zeige LoadingScreen nur während loading Phase
  if (isLoading || loadingProgress.phase === "loading") {
    const loadingProps = getLoadingScreenProps();
    return (
      <LoadingScreen
        progress={loadingProps.progress}
        message={loadingProps.message}
      />
    );
  }

  if (isMonthComplete) {
    if (albumId) {
      // Wenn ein Album durchgearbeitet wurde
      return (
        <AlbumCompleteScreen
          albumTitle={currentAlbumTitle || "Unbekanntes Album"}
          albumId={albumId}
          photosToDelete={photosToDelete.length}
          totalSize={photosToDelete.reduce(
            (acc, photo) => acc + (photo.fileSize || 0),
            0
          )}
          onDelete={deleteSelectedPhotos}
          onClose={() => router.back()}
          photos={photosToDelete}
          onRemovePhoto={removeFromDeleteList}
        />
      );
    }
    // Wenn ein Monat durchgearbeitet wurde
    return (
      <MonthCompleteScreen
        month={getMonthName(currentMonth.getMonth())}
        year={currentMonth.getFullYear()}
        photosToDelete={photosToDelete}
        totalSize={photosToDelete.reduce(
          (acc, photo) => acc + (photo.fileSize || 0),
          0
        )}
        onDelete={deleteSelectedPhotos}
        onContinue={moveToNextMonth}
        photos={photosToDelete}
        onRemovePhoto={removeFromDeleteList}
        isLastMonth={isLastMonth}
        nextMonthLabel={nextMonthLabel}
        uniqueMonthsCount={uniqueMonthsCount}
        prefetchNextMonth={prefetchNextMonth}
      />
    );
  }

  // Main Render
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <HeaderControls
        previousPhoto={previousPhoto}
        photosToDelete={photosToDelete}
        onUndo={handleUndo}
        onDelete={deleteSelectedPhotos}
        onRemoveFromDeleteList={removeFromDeleteList}
        topInset={insets.top}
        progress={progress}
        currentDate={
          currentPhoto?.creationTime
            ? new Date(currentPhoto.creationTime)
            : undefined
        }
      />

      {currentPhoto ? (
        <View style={styles.photoContainer}>
          <SwipeablePhoto
            uri={currentPhoto.uri}
            nextPhotos={nextPhotos.map((p) => p.uri)}
            onSwipe={handleSwipeWithPaywall}
            onPress={() => setIsFullscreen(true)}
          />

          {/* 🛑 Loading Overlay wenn nächstes Foto noch lädt */}
          {isNextPhotoLoading && (
            <View
              style={{
                position: "absolute",
                top: "50%",
                alignSelf: "center",
                backgroundColor: colors.background,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                opacity: 0.95,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  textAlign: "center",
                }}
              >
                ⏳ {t('loadingScreen.nextPhotoLoading')}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.text,
                  opacity: 0.7,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {t('loadingScreen.pleaseWait')}
              </Text>
            </View>
          )}

          <Modal
            visible={isFullscreen}
            transparent={false}
            animationType="fade"
            onRequestClose={() => setIsFullscreen(false)}
          >
            <FullscreenImage
              uri={currentPhoto.uri}
              onClose={() => setIsFullscreen(false)}
            />
          </Modal>
        </View>
      ) : (
        <Text style={styles.message}>
          Keine weiteren Fotos in diesem {albumId ? "Album" : "Monat"}
        </Text>
      )}

      {/* Hintergrund-Loading-Indikator */}
      {loadingProgress.phase === "background" && (
        <View
          style={{
            position: "absolute",
            bottom: 100,
            alignSelf: "center",
            backgroundColor: colors.background,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            opacity: 0.8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: colors.text,
            }}
          >
            Lade weitere Fotos... ({loadingProgress.current}/
            {loadingProgress.total})
          </Text>
        </View>
      )}
    </View>
  );
}
