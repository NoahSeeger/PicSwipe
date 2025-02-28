import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
  Image,
  Text,
} from "react-native";
import { IconSymbol } from "../ui/IconSymbol";
import { useTheme } from "@/components/ThemeProvider";
import { PhotoToDelete } from "../../hooks/usePhotoManager";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  photos: PhotoToDelete[];
  onRemovePhoto: (id: string) => void;
  onConfirmDelete: () => Promise<void>;
  totalSize: number;
};

const formatFileSize = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

export function DeletePreviewModal({
  visible,
  onClose,
  photos,
  onRemovePhoto,
  onConfirmDelete,
  totalSize,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  console.log("Photos in DeletePreviewModal:", photos);
  console.log("Total size:", totalSize);

  const handleLongPressDelete = () => {
    onConfirmDelete();
  };

  const handlePressDelete = () => {
    Alert.alert(
      "Fotos löschen",
      `${photos.length} Foto${photos.length === 1 ? "" : "s"} (${formatFileSize(
        totalSize
      )}) löschen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: onConfirmDelete,
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    closeButton: {
      padding: 8,
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      gap: 8,
    },
    deleteText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    gridContainer: {
      padding: 8,
      flexDirection: "row",
      flexWrap: "wrap",
    },
    photoContainer: {
      width: "33.33%",
      aspectRatio: 1,
      padding: 4,
      position: "relative",
    },
    thumbnail: {
      width: "100%",
      height: "100%",
      borderRadius: 8,
    },
    removeButton: {
      position: "absolute",
      top: 8,
      right: 8,
      zIndex: 1,
      backgroundColor: "white",
      borderRadius: 12,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Zu löschende Fotos</Text>
          <Pressable
            onPress={handlePressDelete}
            onLongPress={handleLongPressDelete}
            style={styles.deleteButton}
          >
            <IconSymbol name="trash" size={24} color={colors.deleteButton} />
            <Text style={styles.deleteText}>{formatFileSize(totalSize)}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoContainer}>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemovePhoto(photo.id)}
              >
                <IconSymbol
                  name="minus.circle.fill"
                  size={24}
                  color="#FF3B30"
                />
              </TouchableOpacity>
              <Image
                source={{ uri: photo.uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
