import React, { useState, useRef } from "react";
import { Pressable, Text, StyleSheet, Animated, View } from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { DeletePreviewModal } from "./DeletePreviewModal";
import { PhotoToDelete } from "@/hooks/usePhotoManager";
import * as Haptics from "expo-haptics";
import { useI18n, useNumberFormat } from "@/hooks/useI18n";

const LONG_PRESS_DURATION = 1500; // 1.5 Sekunden

type DeleteButtonProps = {
  onDelete: () => Promise<boolean>;
  photos: PhotoToDelete[];
  onRemovePhoto: (id: string) => void;
  totalSize: number;
};

export function DeleteButton({
  onDelete,
  photos,
  onRemovePhoto,
  totalSize,
}: DeleteButtonProps) {
  const { colors } = useTheme();
  const { t } = useI18n('cleanup');
  const { formatBytes } = useNumberFormat();
  const [showDeletePreview, setShowDeletePreview] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressProgress = useRef(new Animated.Value(0)).current;
  const pressStartTime = useRef<number>(0);

  const handleDelete = async () => {
    const success = await onDelete();
    if (success) {
      setShowDeletePreview(false);
    }
  };

  const startLongPress = () => {
    pressStartTime.current = Date.now();
    setIsLongPressing(true);
    longPressProgress.setValue(0);

    // Initial haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.timing(longPressProgress, {
      toValue: 1,
      duration: LONG_PRESS_DURATION,
      useNativeDriver: false,
    }).start(async ({ finished }) => {
      if (finished) {
        // Strong haptic feedback when complete
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsLongPressing(false);
        const success = await onDelete();
        if (!success) {
          // Error haptic feedback if delete fails
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    });
  };

  const endLongPress = () => {
    const pressDuration = Date.now() - pressStartTime.current;

    if (pressDuration < LONG_PRESS_DURATION) {
      // Light haptic feedback for normal press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowDeletePreview(true);
    }

    setIsLongPressing(false);
    longPressProgress.setValue(0);
    Animated.timing(longPressProgress, {
      toValue: 0,
      duration: 0,
      useNativeDriver: false,
    }).stop();
  };

  const progressWidth = longPressProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const buttonOpacity = longPressProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });

  return (
    <>
      <Pressable
        onPressIn={startLongPress}
        onPressOut={endLongPress}
        style={({ pressed }) => [
          styles.buttonContainer,
          pressed && !isLongPressing && styles.buttonPressed,
        ]}
      >
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: buttonOpacity,
            },
          ]}
        >
          <IconSymbol name="trash.fill" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {t('deleteButton.deletePhotos')}
            {"\n"}
            <Text style={styles.buttonSubtext}>
              {t('deleteButton.longPressHint')}
            </Text>
          </Text>
        </Animated.View>
        {isLongPressing && (
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarForeground,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>
        )}
      </Pressable>

      <DeletePreviewModal
        visible={showDeletePreview}
        onClose={() => setShowDeletePreview(false)}
        photos={photos}
        onRemovePhoto={onRemovePhoto}
        onConfirmDelete={handleDelete}
        totalSize={totalSize}
      />
    </>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  buttonSubtext: {
    fontSize: 12,
    opacity: 0.8,
  },
  progressBarBackground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  progressBarForeground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 100,
    backgroundColor: "rgba(255 255 255 / 0.56)",
    zIndex: 1,
  },
});
