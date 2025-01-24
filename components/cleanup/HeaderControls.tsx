import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { ThemedText } from "../ThemedText";
import { IconSymbol } from "../ui/IconSymbol";
import { PhotoToDelete } from "../../hooks/usePhotoManager";
import { DeletePreviewModal } from "./DeletePreviewModal";

type Props = {
  previousPhoto: any;
  photosToDelete: PhotoToDelete[];
  onUndo: () => void;
  onDelete: () => Promise<boolean>;
  topInset: number;
  progress: {
    current: number;
    total: number;
  };
  currentDate?: Date;
  onRemoveFromDeleteList?: (id: string) => void;
};

const formatFileSize = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

export const HeaderControls = ({
  previousPhoto,
  photosToDelete,
  onUndo,
  onDelete,
  topInset,
  progress,
  currentDate,
  onRemoveFromDeleteList,
}: Props) => {
  const [showDeletePreview, setShowDeletePreview] = useState(false);

  const totalSize = photosToDelete.reduce(
    (acc, photo) => acc + (photo.fileSize || 0),
    0
  );

  console.log("HeaderControls photosToDelete:", photosToDelete); // Debug log
  console.log("HeaderControls totalSize:", totalSize); // Debug log

  const formatDate = (date?: Date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const handleDeletePress = () => {
    if (photosToDelete.length === 0) return;
    setShowDeletePreview(true);
  };

  const handleRemovePhoto = (id: string) => {
    onRemoveFromDeleteList?.(id);
  };

  const handleConfirmDelete = async () => {
    const success = await onDelete();
    if (success) {
      setShowDeletePreview(false);
    }
  };

  return (
    <>
      <View style={[styles.header, { marginTop: topInset }]}>
        <View style={styles.leftSection}>
          <ThemedText style={styles.progressText}>
            {progress.current} / {progress.total}
          </ThemedText>
        </View>
        <View style={styles.centerSection}>
          <ThemedText style={styles.dateText}>
            {formatDate(currentDate)}
          </ThemedText>
        </View>
        <View style={styles.rightSection}>
          {previousPhoto && (
            <TouchableOpacity
              style={[styles.headerButton, styles.undoButton]}
              onPress={onUndo}
            >
              <IconSymbol
                name="arrow.uturn.backward"
                size={24}
                color="#007AFF"
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.headerButton, styles.deleteButton]}
            onPress={handleDeletePress}
            disabled={photosToDelete.length === 0}
          >
            <IconSymbol
              name="trash"
              size={24}
              color={photosToDelete.length > 0 ? "#FF3B30" : "#999"}
            />
            {photosToDelete.length > 0 && (
              <>
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>
                    {photosToDelete.length}
                  </ThemedText>
                </View>
                <View style={styles.sizeIndicator}>
                  <ThemedText style={styles.sizeText}>
                    {formatFileSize(totalSize)}
                  </ThemedText>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <DeletePreviewModal
        visible={showDeletePreview}
        onClose={() => setShowDeletePreview(false)}
        photos={photosToDelete}
        onRemovePhoto={handleRemovePhoto}
        onConfirmDelete={handleConfirmDelete}
        totalSize={totalSize}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flex: 1,
    alignItems: "flex-start",
  },
  centerSection: {
    flex: 2,
    alignItems: "center",
  },
  rightSection: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  undoButton: {
    // Entferne den Hintergrund
  },
  deleteButton: {
    // Entferne den Hintergrund
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 20,
  },
  sizeIndicator: {
    position: "absolute",
    top: 44,
    right: 0,
    backgroundColor: "transparent",
  },
  sizeText: {
    fontSize: 12,
    color: "#FF3B30",
    fontWeight: "500",
  },
});
