import React, { useEffect, useState } from "react";
import { View, StyleSheet, Modal, Linking, Text } from "react-native";
import { RevenueCatUI, PAYWALL_RESULT } from "react-native-purchases-ui";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ThemeProvider";
import { useRouter } from "expo-router";

// Hooks
import { usePhotoManager } from "@/hooks/usePhotoManager";
import { useSwipeLimit } from "@/hooks/useSwipeLimit";

// Components
import { HeaderControls } from "@/components/cleanup/HeaderControls";
import { SwipeablePhoto } from "@/components/cleanup/SwipeablePhoto";
import { FullscreenImage } from "@/components/FullscreenImage";
import { MonthCompleteScreen } from "@/components/cleanup/MonthCompleteScreen";
import { AlbumCompleteScreen } from "@/components/cleanup/AlbumCompleteScreen";
import { LoadingScreen } from "@/components/cleanup/LoadingScreen";

export default function CleanupScreen() {
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
  } = usePhotoManager();

  const { swipes, incrementSwipe, hasReachedLimit, isPro } = useSwipeLimit();

  // Handle swipe with paywall logic
  const handleSwipeWithPaywall = async (direction: "left" | "right") => {
    if (hasReachedLimit) {
      try {
        const result = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: "pro",
        });
        if (
          result === PAYWALL_RESULT.PURCHASED ||
          result === PAYWALL_RESULT.RESTORED
        ) {
          incrementSwipe();
          moveToNextPhoto(direction === "left");
        }
        // else: do nothing
      } catch (e) {
        // do nothing or optionally log error
      }
    } else {
      incrementSwipe();
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
          const now = new Date();
          await setInitialMonth(
            now.getFullYear(),
            now.getMonth(),
            undefined,
            eagerLoadCount
          );
        }
      } catch (error) {
        console.error("Error loading photos:", error);
      }
    };

    loadPhotos();
  }, [year, month, albumId]);

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
          message: "Suche Fotos...",
        };
      case "eager":
        return {
          progress: {
            current: loadingProgress.current,
            total: Math.min(loadingProgress.eagerCount, loadingProgress.total),
          },
          message: `Lade erste ${Math.min(
            loadingProgress.eagerCount,
            loadingProgress.total
          )} Fotos...`,
        };
      case "background":
        return {
          progress: {
            current: loadingProgress.eagerCount,
            total: loadingProgress.eagerCount,
          },
          message:
            "Bereit zum Sortieren! Weitere Fotos werden im Hintergrund geladen...",
        };
      case "complete":
        return {
          progress: {
            current: loadingProgress.total,
            total: loadingProgress.total,
          },
          message: "Alle Fotos geladen!",
        };
      default:
        return {
          progress: { current: 0, total: 1 },
          message: "Lade...",
        };
    }
  };

  console.log("isLoading", isLoading);

  // Zeige LoadingScreen nur wenn initial geladen wird oder eager loading noch nicht fertig
  if (
    isLoading ||
    (loadingProgress.phase === "eager" &&
      loadingProgress.current < loadingProgress.eagerCount)
  ) {
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
        month={new Intl.DateTimeFormat("de-DE", { month: "long" }).format(
          currentMonth
        )}
        year={currentMonth.getFullYear()}
        photosToDelete={photosToDelete.length}
        totalSize={photosToDelete.reduce(
          (acc, photo) => acc + (photo.fileSize || 0),
          0
        )}
        onDelete={deleteSelectedPhotos}
        onContinue={moveToNextMonth}
        photos={photosToDelete}
        onRemovePhoto={removeFromDeleteList}
        isLastMonth={isLastMonth}
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
