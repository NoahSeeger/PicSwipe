import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Modal, Linking } from "react-native";
import { ThemedView } from "../../components/ThemedView";
import { ThemedText } from "../../components/ThemedText";
import { usePhotoPermission } from "../../hooks/usePhotoPermission";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePhotoManager } from "../../hooks/usePhotoManager";
import { HeaderControls } from "../../components/cleanup/HeaderControls";
import { SwipeablePhoto } from "../../components/cleanup/SwipeablePhoto";
import { FullscreenImage } from "../../components/FullscreenImage";
import { MonthCompleteScreen } from "../../components/cleanup/MonthCompleteScreen";
import { LoadingScreen } from "../../components/cleanup/LoadingScreen";
import { useLocalSearchParams } from "expo-router";

export default function CleanupScreen() {
  const { permissionStatus, requestPermission, checkPermissions } =
    usePhotoPermission();
  const { year, month } = useLocalSearchParams<{
    year: string;
    month: string;
  }>();
  const {
    currentPhoto,
    nextPhotos,
    photosToDelete,
    previousPhoto,
    moveToNextPhoto,
    handleUndo,
    deleteSelectedPhotos,
    progress,
    loadMonthPhotos,
    removeFromDeleteList,
    isMonthComplete,
    currentMonth,
    moveToNextMonth,
    isLoading,
    setInitialMonth,
    isLastMonth,
  } = usePhotoManager();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const insets = useSafeAreaInsets();

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
      console.log("CleanupScreen: Permission and params check", {
        permissionStatus,
        year,
        month,
        hasPermission: permissionStatus === "granted",
      });

      if (permissionStatus === "granted" && year && month) {
        try {
          console.log("CleanupScreen: Loading photos for", {
            year: parseInt(year),
            month: parseInt(month),
          });
          await setInitialMonth(parseInt(year), parseInt(month));
        } catch (error) {
          console.error("CleanupScreen: Error loading photos:", error);
        }
      }
    };

    loadPhotos();
  }, [permissionStatus, year, month]);

  if (permissionStatus === "denied") {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.messageContainer}>
          <ThemedText style={styles.message}>
            Um deine Fotos zu verwalten, benötigen wir Zugriff auf deine
            Galerie. Bitte erlaube den Zugriff in den Einstellungen.
          </ThemedText>
          <ThemedText
            style={styles.button}
            onPress={() => Linking.openSettings()}
          >
            Einstellungen öffnen
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (permissionStatus === "undetermined") {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.messageContainer}>
          <ThemedText style={styles.message}>
            Um deine Fotos zu verwalten, benötigen wir Zugriff auf deine Galerie
          </ThemedText>
          <ThemedText style={styles.button} onPress={requestPermission}>
            Foto-Zugriff erlauben
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

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

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
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
            onSwipe={(direction) => {
              moveToNextPhoto(direction === "left");
            }}
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
        <ThemedText style={styles.message}>
          Keine weiteren Fotos in diesem Monat
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121214",
  },
  messageContainer: {
    padding: 20,
    alignItems: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    color: "white",
  },
  photoContainer: {
    alignItems: "center",
  },
});
