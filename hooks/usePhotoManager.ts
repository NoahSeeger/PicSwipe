import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";

export type PhotoToDelete = {
  id: string;
  uri: string;
  fileSize?: number;
};

type AssetInfo = MediaLibrary.Asset & {
  fileSize?: number;
};

type EnhancedAsset = MediaLibrary.Asset & {
  uri: string;
  fileSize: number;
};

const getAssetInfo = async (
  asset: MediaLibrary.Asset
): Promise<EnhancedAsset> => {
  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset.id);

    // Für iOS: Verwende nur die localUri, da diese im richtigen Format ist
    if (Platform.OS === "ios") {
      if (!info.localUri) {
        throw new Error("No localUri available for iOS asset");
      }
      return {
        ...asset,
        uri: info.localUri,
        // @ts-ignore - fileSize existiert in der iOS Implementation
        fileSize: info.fileSize || 0,
      };
    }

    // Für Android: Verwende die normale uri
    return {
      ...asset,
      uri: asset.uri,
      // @ts-ignore - fileSize existiert in der iOS Implementation
      fileSize: info.fileSize || 0,
    };
  } catch (error) {
    console.error("Error getting asset info:", error, {
      assetId: asset.id,
      uri: asset.uri,
    });

    // Fallback: Versuche die Standard-URI zu verwenden
    return {
      ...asset,
      uri: asset.uri,
      fileSize: 0,
    };
  }
};

// Durchschnittliche Bytes pro Pixel für ein JPEG-Bild (typische Kompression)
const BYTES_PER_PIXEL = 0.3; // Reduziert von 4 auf 0.3 für realistischere JPEG-Größen

const estimatePhotoSize = (width: number, height: number): number => {
  // Berechne die Anzahl der Pixel
  const pixels = width * height;

  // Schätze die Dateigröße basierend auf der typischen JPEG-Kompression
  const estimatedSize = pixels * BYTES_PER_PIXEL;

  // Füge einen minimalen Overhead hinzu (JPEG-Header etc.)
  const minSize = 10 * 1024; // Minimale Größe von 10KB

  return Math.max(estimatedSize, minSize);
};

export const usePhotoManager = () => {
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [currentAlbumId, setCurrentAlbumId] = useState<string | null>(null);
  const [currentAlbumTitle, setCurrentAlbumTitle] = useState<string | null>(
    null
  );
  const [monthPhotos, setMonthPhotos] = useState<AssetInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photosToDelete, setPhotosToDelete] = useState<PhotoToDelete[]>([]);
  const [previousPhoto, setPreviousPhoto] = useState<AssetInfo | null>(null);
  const [isMonthComplete, setIsMonthComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 0,
  });
  const [processedMonths, setProcessedMonths] = useState<Set<string>>(
    new Set()
  );
  const [isLastMonth, setIsLastMonth] = useState(false);

  const loadPhotos = async (
    date: Date | null = currentMonth,
    albumId: string | null = currentAlbumId
  ) => {
    try {
      console.log("Loading photos with params:", { date, albumId });
      setIsLoading(true);
      setLoadingProgress({ current: 0, total: 0 });
      setMonthPhotos([]);
      setCurrentIndex(0);
      setPhotosToDelete([]);

      const options: MediaLibrary.AssetsOptions = {
        mediaType: MediaLibrary.MediaType.photo,
        first: 999999,
        sortBy: MediaLibrary.SortBy.creationTime,
      };

      // Wenn eine Album-ID vorhanden ist, lade nur Fotos aus diesem Album
      if (albumId) {
        console.log("Loading photos from album:", albumId);
        try {
          // Hole zuerst alle Alben
          const albums = await MediaLibrary.getAlbumsAsync();
          const album = albums.find((a) => a.id === albumId);

          if (!album) {
            console.error("Album not found:", albumId);
            return;
          }

          setCurrentAlbumTitle(album.title);

          const { assets } = await MediaLibrary.getAssetsAsync({
            ...options,
            album: album,
          });

          if (assets.length > 0) {
            setLoadingProgress({ current: 0, total: assets.length });
            // Lade die vollständigen Asset-Informationen
            const loadedAssets = [];
            for (let i = 0; i < assets.length; i++) {
              try {
                const assetInfo = await MediaLibrary.getAssetInfoAsync(
                  assets[i]
                );
                loadedAssets.push({
                  ...assetInfo,
                  uri: assetInfo.localUri || assetInfo.uri,
                });
                setLoadingProgress((prev) => ({ ...prev, current: i + 1 }));
              } catch (error) {
                console.error("Error loading asset info:", error);
                loadedAssets.push(assets[i]);
              }
            }
            setMonthPhotos(loadedAssets);
            setIsMonthComplete(false);
          }
          return;
        } catch (error) {
          console.error("Error loading album:", error);
          return;
        }
      }

      // Wenn keine Album-ID vorhanden ist, lade Fotos nach Datum
      if (date) {
        const { assets } = await MediaLibrary.getAssetsAsync(options);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        // Filtere manuell nach Datum
        const filteredAssets = assets.filter((asset) => {
          const assetDate = new Date(asset.creationTime);
          return assetDate >= startOfMonth && assetDate <= endOfMonth;
        });

        if (filteredAssets.length > 0) {
          setLoadingProgress({ current: 0, total: filteredAssets.length });
          // Lade die vollständigen Asset-Informationen
          const loadedAssets = [];
          for (let i = 0; i < filteredAssets.length; i++) {
            try {
              const assetInfo = await MediaLibrary.getAssetInfoAsync(
                filteredAssets[i]
              );
              loadedAssets.push({
                ...assetInfo,
                uri: assetInfo.localUri || assetInfo.uri,
              });
              setLoadingProgress((prev) => ({ ...prev, current: i + 1 }));
            } catch (error) {
              console.error("Error loading asset info:", error);
              loadedAssets.push(filteredAssets[i]);
            }
          }
          setMonthPhotos(loadedAssets);
          setIsMonthComplete(false);
        } else {
          console.log("No photos found");
          handleNoPhotos(date);
        }
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    } finally {
      setIsLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  };

  const handleNoPhotos = async (date: Date) => {
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    setProcessedMonths((prev) => new Set(prev).add(monthKey));
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    setCurrentMonth(prevMonth);
    await loadPhotos(prevMonth, null);
  };

  const getAssetFileSize = async (assetId: string): Promise<number> => {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
      // @ts-ignore - fileSize existiert in der iOS Implementation
      return assetInfo.fileSize || 0;
    } catch (error) {
      console.error("Error getting asset info:", error);
      return 0;
    }
  };

  const moveToNextPhoto = async (addToDeleteList: boolean = false) => {
    const currentPhoto = monthPhotos[currentIndex];

    if (!currentPhoto) {
      console.log("No current photo available");
      return;
    }

    setPreviousPhoto(currentPhoto);

    if (addToDeleteList) {
      try {
        const isDuplicate = photosToDelete.some(
          (photo) => photo.id === currentPhoto.id
        );
        if (!isDuplicate) {
          const estimatedSize = estimatePhotoSize(
            currentPhoto.width,
            currentPhoto.height
          );
          setPhotosToDelete((prev) => [
            ...prev,
            {
              id: currentPhoto.id,
              uri: currentPhoto.uri,
              fileSize: estimatedSize,
            },
          ]);
        }
      } catch (error) {
        console.error("Error getting asset info:", error);
      }
    }

    if (currentIndex >= monthPhotos.length - 1) {
      setIsMonthComplete(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleUndo = () => {
    if (!previousPhoto || currentIndex <= 0) return;

    setCurrentIndex((prev) => prev - 1);
    setPhotosToDelete((prev) =>
      prev.filter((photo) => photo.id !== previousPhoto.id)
    );
    setPreviousPhoto(null);
  };

  const deleteSelectedPhotos = async () => {
    try {
      if (photosToDelete.length === 0) return true;

      await MediaLibrary.deleteAssetsAsync(
        photosToDelete.map((photo) => photo.id)
      );
      setPhotosToDelete([]);

      if (currentMonth && !currentAlbumId) {
        // Nur für Monatsansicht
        const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
        setProcessedMonths((prev) => new Set(prev).add(monthKey));
        await moveToNextMonth();
      } else if (currentAlbumId) {
        // Für Albumansicht
        await loadPhotos(null, currentAlbumId);
      }

      return true;
    } catch (error) {
      console.error("Error deleting photos:", error);
      return false;
    }
  };

  const removeFromDeleteList = (id: string) => {
    setPhotosToDelete((prev) => prev.filter((photo) => photo.id !== id));
  };

  const calculateTotalSize = (photos: PhotoToDelete[]) => {
    return photos.reduce((acc, photo) => acc + (photo.fileSize || 0), 0);
  };

  const findPreviousMonthWithPhotos = useCallback(async (startDate: Date) => {
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 1,
        createdBefore: startDate.getTime(),
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      if (assets.length === 0) {
        return null;
      }

      const previousPhotoDate = new Date(assets[0].creationTime);
      return new Date(
        previousPhotoDate.getFullYear(),
        previousPhotoDate.getMonth(),
        1
      );
    } catch (error) {
      console.error("Error finding previous month with photos:", error);
      return null;
    }
  }, []);

  const moveToNextMonth = useCallback(async () => {
    if (!currentMonth) return;

    const startOfCurrentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
      0,
      0,
      0
    );

    const previousMonthWithPhotos = await findPreviousMonthWithPhotos(
      startOfCurrentMonth
    );

    if (!previousMonthWithPhotos) {
      setIsLastMonth(true);
      return;
    }

    setCurrentMonth(previousMonthWithPhotos);
    await loadPhotos(previousMonthWithPhotos, null);
  }, [currentMonth, findPreviousMonthWithPhotos]);

  const setInitialMonth = async (
    year: number,
    month: number,
    albumId?: string
  ) => {
    console.log("PhotoManager: setInitialMonth called", {
      year,
      month,
      albumId,
    });

    try {
      setIsLoading(true);
      if (albumId) {
        // Wenn ein Album ausgewählt wurde, setze den Album-Modus
        setCurrentAlbumId(albumId);
        setCurrentMonth(null); // Deaktiviere die Monatsansicht
        await loadPhotos(null, albumId);
      } else {
        // Wenn kein Album ausgewählt wurde, setze den Monats-Modus
        setCurrentAlbumId(null);
        const date = new Date(year, month, 1);
        setCurrentMonth(date);
        await loadPhotos(date, null);
      }
    } catch (error) {
      console.error("PhotoManager: Error in setInitialMonth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentPhoto = monthPhotos[currentIndex];
  const nextPhotos = monthPhotos.slice(currentIndex + 1, currentIndex + 3);
  const progress = {
    current: monthPhotos.length > 0 ? currentIndex + 1 : 0,
    total: monthPhotos.length,
  };

  return {
    currentPhoto,
    nextPhotos,
    photosToDelete,
    previousPhoto,
    moveToNextPhoto,
    handleUndo,
    deleteSelectedPhotos,
    loadPhotos,
    progress,
    removeFromDeleteList,
    totalSize: calculateTotalSize(photosToDelete),
    isMonthComplete,
    currentMonth: currentMonth || new Date(),
    moveToNextMonth,
    isLoading,
    loadingProgress,
    setInitialMonth,
    isLastMonth,
    currentAlbumTitle,
  };
};
