import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Alert, Text } from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import { PhotoToDelete } from "../../hooks/usePhotoManager";
import { DeletePreviewModal } from "./DeletePreviewModal";
import { useTheme } from "@/components/ThemeProvider";

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

export function HeaderControls({
  previousPhoto,
  photosToDelete,
  onUndo,
  onDelete,
  topInset,
  progress,
  currentDate,
  onRemoveFromDeleteList,
}: Props) {
  const { colors } = useTheme();
  const [showDeletePreview, setShowDeletePreview] = useState(false);

  const formatDate = (date?: Date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
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
      color: colors.text,
    },
    dateText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
    headerButton: {
      position: "relative",
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: -5,
      right: -5,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      borderWidth: 1.5,
      borderColor: colors.text,
      backgroundColor: "red",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    badgeText: {
      color: "#FFFFFF",
      fontSize: 13,
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
      color: colors.text,
      fontWeight: "500",
    },
  });

  return (
    <>
      <View style={[styles.header, { marginTop: topInset }]}>
        <View style={styles.leftSection}>
          <Text style={styles.progressText}>
            {progress.current} / {progress.total}
          </Text>
        </View>
        <View style={styles.centerSection}>
          <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
        </View>
        <View style={styles.rightSection}>
          {previousPhoto && (
            <TouchableOpacity style={styles.headerButton} onPress={onUndo}>
              <IconSymbol
                name="arrow.uturn.backward"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowDeletePreview(true)}
            disabled={photosToDelete.length === 0}
          >
            <IconSymbol
              name="trash"
              size={24}
              color={
                photosToDelete.length > 0
                  ? colors.primary
                  : colors.secondary
              }
            />
            {photosToDelete.length > 0 && (
              <>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{photosToDelete.length}</Text>
                </View>
                <View style={styles.sizeIndicator}>
                  <Text style={styles.sizeText}>
                    {formatFileSize(
                      photosToDelete.reduce(
                        (acc, photo) => acc + (photo.fileSize || 0),
                        0
                      )
                    )}
                  </Text>
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
        onRemovePhoto={onRemoveFromDeleteList}
        onConfirmDelete={async () => {
          const success = await onDelete();
          if (success) {
            setShowDeletePreview(false);
          }
        }}
        totalSize={photosToDelete.reduce(
          (acc, photo) => acc + (photo.fileSize || 0),
          0
        )}
      />
    </>
  );
}
