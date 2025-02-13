import React, { useEffect, useState } from "react";
import { View, StyleSheet, Modal, Linking, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ThemeProvider";
import { useRouter } from "expo-router";

// Hooks
import { usePhotoPermission } from "@/hooks/usePhotoPermission";
import { usePhotoManager } from "@/hooks/usePhotoManager";

// Components
import { HeaderControls } from "@/components/cleanup/HeaderControls";
import { SwipeablePhoto } from "@/components/cleanup/SwipeablePhoto";
import { FullscreenImage } from "@/components/FullscreenImage";
import { MonthCompleteScreen } from "@/components/cleanup/MonthCompleteScreen";
import { AlbumCompleteScreen } from "@/components/cleanup/AlbumCompleteScreen";
import { LoadingScreen } from "@/components/cleanup/LoadingScreen";

export default function CleanupScreen() {
  // Hooks & State
  const { permissionStatus, requestPermission, checkPermissions } =
    usePhotoPermission();
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
    loadingProgress,
    setInitialMonth,
    isLastMonth,
    currentAlbumTitle,
  } = usePhotoManager();

  // Effects
  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (permissionStatus === "undetermined") {
      requestPermission();
    }
  }, [permissionStatus]);

  useEffect(() => {
    const loadPhotos = async () => {
      if (permissionStatus === "granted") {
        try {
          if (albumId) {
            // Wenn eine Album-ID vorhanden ist, lade die Fotos aus diesem Album
            await setInitialMonth(0, 0, albumId);
          } else if (year && month) {
            // Wenn Jahr und Monat vorhanden sind, lade die Fotos aus diesem Monat
            await setInitialMonth(parseInt(year), parseInt(month));
          } else {
            // Ansonsten lade den aktuellen Monat
            const now = new Date();
            await setInitialMonth(now.getFullYear(), now.getMonth());
          }
        } catch (error) {
          console.error("Error loading photos:", error);
        }
      }
    };

    loadPhotos();
  }, [permissionStatus, year, month, albumId]);

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

  // Conditional Renders
  if (permissionStatus === "denied") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.messageContainer}>
          <Text style={styles.message}>
            Um deine Fotos zu verwalten, benötigen wir Zugriff auf deine
            Galerie. Bitte erlaube den Zugriff in den Einstellungen.
          </Text>
          <Text style={styles.button} onPress={() => Linking.openSettings()}>
            Einstellungen öffnen
          </Text>
        </View>
      </View>
    );
  }

  if (permissionStatus === "undetermined") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.messageContainer}>
          <Text style={styles.message}>
            Um deine Fotos zu verwalten, benötigen wir Zugriff auf deine Galerie
          </Text>
          <Text style={styles.button} onPress={requestPermission}>
            Foto-Zugriff erlauben
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) return <LoadingScreen progress={loadingProgress} />;

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
            onSwipe={(direction) => moveToNextPhoto(direction === "left")}
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
        <Text style={styles.message}>Keine weiteren Fotos in diesem Monat</Text>
      )}
    </View>
  );
}
