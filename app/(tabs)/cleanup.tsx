import React, { useEffect, useState } from "react";
import { View, StyleSheet, Modal, Linking, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ThemeProvider";

// Hooks
import { usePhotoPermission } from "@/hooks/usePhotoPermission";
import { usePhotoManager } from "@/hooks/usePhotoManager";

// Components
import { HeaderControls } from "@/components/cleanup/HeaderControls";
import { SwipeablePhoto } from "@/components/cleanup/SwipeablePhoto";
import { FullscreenImage } from "@/components/FullscreenImage";
import { MonthCompleteScreen } from "@/components/cleanup/MonthCompleteScreen";
import { LoadingScreen } from "@/components/cleanup/LoadingScreen";

export default function CleanupScreen() {
  // Hooks & State
  const { permissionStatus, requestPermission, checkPermissions } =
    usePhotoPermission();
  const { year, month } = useLocalSearchParams<{
    year: string;
    month: string;
  }>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

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
    setInitialMonth,
    isLastMonth,
    loadLatestMonth,
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
          if (year && month) {
            await setInitialMonth(parseInt(year), parseInt(month));
          } else {
            // Get the current date
            const now = new Date();
            await setInitialMonth(now.getFullYear(), now.getMonth());
          }
          // If no photos were found in the initial month, moveToNextMonth will be called automatically
          // through the handleNoPhotos function in usePhotoManager
        } catch (error) {
          console.error("Error loading photos:", error);
        }
      }
    };

    loadPhotos();
  }, [permissionStatus, year, month]);

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

  if (isLoading) return <LoadingScreen />;

  if (isMonthComplete) {
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
