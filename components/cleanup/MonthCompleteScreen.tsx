import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Alert,
  Animated,
  Text,
} from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import { DeletePreviewModal } from "./DeletePreviewModal";
import { useTheme } from "@/components/ThemeProvider";

type Props = {
  month: string;
  year: number;
  photosToDelete: number;
  totalSize: number;
  onDelete: () => void;
  onContinue: () => void;
  photos: Photo[];
  onRemovePhoto: (id: string) => void;
  isLastMonth?: boolean;
};

const formatFileSize = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

const LONG_PRESS_DURATION = 2000;

export function MonthCompleteScreen({
  month,
  year,
  photosToDelete,
  totalSize,
  onDelete,
  onContinue,
  photos,
  onRemovePhoto,
  isLastMonth = false,
}: Props) {
  const { colors } = useTheme();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const longPressProgress = useRef(new Animated.Value(0)).current;
  const [isLongPressing, setIsLongPressing] = useState(false);
  const pressStartTime = useRef<number>(0);

  const startLongPress = () => {
    pressStartTime.current = Date.now();
    setIsLongPressing(true);
    longPressProgress.setValue(0);

    Animated.timing(longPressProgress, {
      toValue: 1,
      duration: LONG_PRESS_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsLongPressing(false);
        onDelete();
      }
    });
  };

  const endLongPress = () => {
    const pressDuration = Date.now() - pressStartTime.current;

    if (pressDuration < LONG_PRESS_DURATION) {
      setShowDeleteModal(true);
    }

    setIsLongPressing(false);
    longPressProgress.setValue(0);
    Animated.timing(longPressProgress).stop();
  };

  const progressInterpolate = longPressProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <IconSymbol
          name={isLastMonth ? "checkmark.circle.fill" : "checkmark.circle"}
          size={64}
          color="#34C759"
        />

        <Text style={[styles.title, { color: colors.text }]}>
          {isLastMonth ? "Alle Fotos durchgesehen!" : "Monat abgeschlossen!"}
        </Text>

        <Text style={[styles.message, { color: colors.text }]}>
          {isLastMonth
            ? `Du hast alle verfügbaren Fotos durchgearbeitet.`
            : `Du hast alle Bilder des Monats ${month} ${year} durchgearbeitet.`}
        </Text>

        {photosToDelete > 0 ? (
          <Text style={[styles.stats, { color: colors.secondary }]}>
            {photosToDelete} Foto{photosToDelete !== 1 ? "s" : ""} (
            {formatFileSize(totalSize)}) zum Löschen markiert
          </Text>
        ) : (
          <Text style={[styles.stats, { color: colors.secondary }]}>
            Keine Fotos zum Löschen markiert
          </Text>
        )}

        <View style={styles.buttonContainer}>
          {photosToDelete > 0 && (
            <Pressable
              onPressIn={startLongPress}
              onPressOut={endLongPress}
              style={({ pressed }) => [
                styles.button,
                styles.deleteButton,
                pressed && !isLongPressing && styles.deleteButtonPressed,
              ]}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>
                  Jetzt löschen
                  {"\n"}
                  <Text style={styles.buttonSubtext}>
                    Lang drücken zum sofortigen Löschen
                  </Text>
                </Text>
                {isLongPressing && (
                  <Animated.View
                    style={[
                      styles.progressOverlay,
                      styles.deleteButtonProgress,
                      {
                        width: progressInterpolate,
                      },
                    ]}
                  />
                )}
              </View>
            </Pressable>
          )}

          {!isLastMonth && (
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [
                styles.button,
                styles.continueButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Weiter zum nächsten Monat</Text>
            </Pressable>
          )}
        </View>
      </View>

      <DeletePreviewModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        photos={photos}
        onRemovePhoto={onRemovePhoto}
        onConfirmDelete={async () => {
          await onDelete();
          setShowDeleteModal(false);
        }}
        totalSize={totalSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  stats: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 30,
  },
  buttonContainer: {
    gap: 15,
    width: "100%",
  },
  button: {
    padding: 15,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#FF453A",
  },
  deleteButtonPressed: {
    backgroundColor: "#FF3B30",
  },
  deleteButtonProgress: {
    backgroundColor: "rgba(255, 59, 48, 0.8)",
  },
  continueButton: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  buttonSubtext: {
    fontSize: 12,
    opacity: 0.8,
    color: "white",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonContent: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  progressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});
