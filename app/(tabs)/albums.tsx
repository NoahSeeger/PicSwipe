import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Pressable,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import { useTheme } from "@/components/ThemeProvider";
import { useI18n } from "@/hooks/useI18n";

type Album = MediaLibrary.Album & {
  thumbnail?: string;
};

export default function AlbumsScreen() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n('albums');
  const router = useRouter();

  const loadAlbums = async () => {
    try {
      setIsLoading(true);
      // Hole alle benutzerdefinierten Alben
      const userAlbums = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });

      // Sortiere Alben nach Anzahl der Fotos (absteigend)
      const sortedAlbums = userAlbums.sort(
        (a, b) => b.assetCount - a.assetCount
      );

      // Lade für jedes Album ein Vorschaubild
      const albumsWithThumbnails = await Promise.all(
        sortedAlbums.map(async (album) => {
          try {
            // Hole das erste Asset des Albums
            const { assets } = await MediaLibrary.getAssetsAsync({
              album: album,
              first: 1,
              sortBy: MediaLibrary.SortBy.creationTime,
              mediaType: MediaLibrary.MediaType.photo,
            });

            if (assets.length > 0) {
              try {
                // Hole die vollständigen Asset-Informationen
                const assetInfo = await MediaLibrary.getAssetInfoAsync(
                  assets[0].id
                );
                console.log("Asset Info:", {
                  id: assets[0].id,
                  uri: assetInfo.uri,
                  localUri: assetInfo.localUri,
                });

                return {
                  ...album,
                  thumbnail: assetInfo.localUri,
                };
              } catch (assetError) {
                console.error("Error getting asset info:", assetError);
                return album;
              }
            }
            return album;
          } catch (error) {
            console.error("Error loading album assets:", error);
            return album;
          }
        })
      );

      // Filtere Alben ohne Fotos
      const validAlbums = albumsWithThumbnails.filter(
        (album) => album.assetCount > 0
      );
      setAlbums(validAlbums);
    } catch (error) {
      console.error("Error loading albums:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlbumPress = (album: Album) => {
    // Navigiere zur Cleanup-Seite mit Album-ID
    router.push({
      pathname: "/cleanup",
      params: { albumId: album.id },
    });
  };

  const renderAlbumItem = ({ item }: { item: Album }) => (
    <Pressable
      style={({ pressed }) => [
        styles.albumItem,
        { backgroundColor: colors.card },
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => handleAlbumPress(item)}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View
          style={[
            styles.thumbnailPlaceholder,
            { backgroundColor: colors.border },
          ]}
        />
      )}
      <View style={styles.albumInfo}>
        <Text style={[styles.albumTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.albumCount, { color: colors.secondary }]}>
          {t('photosCount', { count: item.assetCount })}
        </Text>
      </View>
    </Pressable>
  );

  useEffect(() => {
    loadAlbums();
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t('title')}</Text>
      <FlatList
        data={albums}
        renderItem={renderAlbumItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={loadAlbums}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  albumItem: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  albumInfo: {
    marginLeft: 12,
    flex: 1,
  },
  albumTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  albumCount: {
    fontSize: 15,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    margin: 20,
  },
});
