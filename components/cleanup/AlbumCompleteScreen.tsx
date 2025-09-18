import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { formatBytes } from "@/utils/formatBytes";
import { PhotoToDelete } from "@/hooks/usePhotoManager";
import { DeleteButton } from "./DeleteButton";
import { useProgress } from "@/hooks/useProgress";

type AlbumCompleteScreenProps = {
  albumTitle: string;
  albumId: string; // Add albumId prop
  photosToDelete: number;
  totalSize: number;
  onDelete: () => Promise<boolean>;
  onClose: () => void;
  photos: PhotoToDelete[];
  onRemovePhoto: (id: string) => void;
};

export function AlbumCompleteScreen({
  albumTitle,
  albumId,
  photosToDelete,
  totalSize,
  onDelete,
  onClose,
  photos,
  onRemovePhoto,
}: AlbumCompleteScreenProps) {
  const { colors } = useTheme();
  const { markAlbumCompleted } = useProgress();

  // Mark album as completed when this screen is shown
  React.useEffect(() => {
    const markCompleted = async () => {
      // Calculate total photos processed (photos to delete + photos that were kept)
      const totalProcessed = photosToDelete + (photos.length - photosToDelete);
      
      await markAlbumCompleted(
        albumId,
        albumTitle,
        totalProcessed, // Total photos processed
        photosToDelete // Photos to be deleted
      );
    };

    markCompleted();
  }, [albumId, albumTitle, photosToDelete, photos.length, markAlbumCompleted]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <IconSymbol
          name="checkmark.circle.fill"
          size={64}
          color={colors.primary}
        />
        <Text style={[styles.title, { color: colors.text }]}>
          Album durchgearbeitet!
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          Du hast das Album "{albumTitle}" sortiert
        </Text>

        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {photosToDelete}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>
              Fotos zum Löschen
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatBytes(totalSize)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>
              Speicherplatz
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <DeleteButton
            onDelete={onDelete}
            photos={photos}
            onRemovePhoto={onRemovePhoto}
            totalSize={totalSize}
          />
          <Pressable
            style={[
              styles.button,
              { backgroundColor: colors.card, marginTop: 12 },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Zurück zur Übersicht
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  statsContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  divider: {
    width: 1,
    marginHorizontal: 16,
  },
  buttonContainer: {
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
