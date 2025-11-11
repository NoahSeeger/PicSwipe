import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { File } from "expo-file-system";
import { logger } from "@/utils/logger";

export type PhotoToDelete = {
  id: string;
  uri: string;
  fileSize?: number;
  monthYear?: string; // Neue Eigenschaft: "November 2022"
};

type AssetInfo = MediaLibrary.Asset & {
  fileSize?: number;
};

type EnhancedAsset = MediaLibrary.Asset & {
  uri: string;
  fileSize: number;
  isLoaded: boolean;
};

type LoadingState = {
  phase: "initial" | "eager" | "background" | "complete";
  current: number;
  total: number;
  eagerCount: number;
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

      let fileSize = 0;
      // Versuche echte Dateigröße zu ermitteln mit neuer File API
      try {
        if (info.localUri.startsWith("file://")) {
          const file = new File(info.localUri);
          try {
            const size = file.size;
            fileSize = size || estimatePhotoSize(asset.width, asset.height);
          } catch (sizeError) {
            console.warn("Could not get file size with new API:", sizeError);
            // Fallback auf Schätzung
            fileSize = estimatePhotoSize(asset.width, asset.height);
          }
        }
      } catch (sizeError) {
        console.warn("Could not get file size:", sizeError);
        // Fallback auf Schätzung
        fileSize = estimatePhotoSize(asset.width, asset.height);
      }

      return {
        ...asset,
        uri: info.localUri,
        fileSize,
        isLoaded: true,
      };
    }

    // Für Android: Verwende die normale uri
    let fileSize = 0;
    try {
      // @ts-ignore - fileSize existiert manchmal in der Android Implementation
      fileSize = info.fileSize || estimatePhotoSize(asset.width, asset.height);
    } catch {
      fileSize = estimatePhotoSize(asset.width, asset.height);
    }

    return {
      ...asset,
      uri: asset.uri,
      fileSize,
      isLoaded: true,
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
      fileSize: estimatePhotoSize(asset.width, asset.height),
      isLoaded: false,
    };
  }
};

// Verbesserte Größenschätzung basierend auf typischen JPEG-Kompressionsraten
const estimatePhotoSize = (width: number, height: number): number => {
  const pixels = width * height;

  // Verschiedene Qualitätsstufen basierend auf Auflösung
  let bytesPerPixel = 0.3;

  if (pixels > 12000000) {
    // > 12MP (z.B. moderne Smartphones)
    bytesPerPixel = 0.4;
  } else if (pixels > 8000000) {
    // > 8MP
    bytesPerPixel = 0.35;
  } else if (pixels < 2000000) {
    // < 2MP (ältere Bilder)
    bytesPerPixel = 0.25;
  }

  const estimatedSize = pixels * bytesPerPixel;
  const minSize = 50 * 1024; // Minimale Größe von 50KB

  return Math.max(estimatedSize, minSize);
};

// Hilfsfunktion für Batch-Processing
const processBatch = async <T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> => {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(processor));

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error(`Error processing item ${i + index}:`, result.reason);
        // Füge Fallback-Wert hinzu falls nötig
      }
    });

    onProgress?.(Math.min(i + batchSize, items.length), items.length);
  }

  return results;
};

export const usePhotoManager = () => {
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [currentAlbumId, setCurrentAlbumId] = useState<string | null>(null);
  const [currentAlbumTitle, setCurrentAlbumTitle] = useState<string | null>(
    null
  );
  const [monthPhotos, setMonthPhotos] = useState<EnhancedAsset[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photosToDelete, setPhotosToDelete] = useState<PhotoToDelete[]>([]);
  const [previousPhoto, setPreviousPhoto] = useState<EnhancedAsset | null>(
    null
  );
  const [isMonthComplete, setIsMonthComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: "initial",
    current: 0,
    total: 0,
    eagerCount: 0,
  });
  const [processedMonths, setProcessedMonths] = useState<Set<string>>(
    new Set()
  );
  const [isLastMonth, setIsLastMonth] = useState(false);

  const loadPhotos = async (
    date: Date | null = currentMonth,
    albumId: string | null = currentAlbumId,
    eagerLoadCount: number = 5
  ) => {
    try {
      logger.info("PhotoManager", `Loading photos for ${date ? 'month' : 'album'}`, {
        albumId,
        month: date?.toISOString(),
      });
      setIsLoading(true);
      setLoadingState({
        phase: "initial",
        current: 0,
        total: 0,
        eagerCount: eagerLoadCount,
      });
      setMonthPhotos([]);
      setCurrentIndex(0);
      // photosToDelete NICHT mehr zurücksetzen - kumulative Sammlung über Monate hinweg
      // setPhotosToDelete([]);  // <- Entfernt

      const options: MediaLibrary.AssetsOptions = {
        mediaType: MediaLibrary.MediaType.photo,
        first: 999999,
        sortBy: MediaLibrary.SortBy.creationTime,
      };

      let rawAssets: MediaLibrary.Asset[] = [];

      // Lade rohe Assets basierend auf Album oder Datum
      if (albumId) {
        console.log("Loading photos from album:", albumId);
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
        rawAssets = assets;
      } else if (date) {
        const { assets } = await MediaLibrary.getAssetsAsync(options);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        rawAssets = assets.filter((asset) => {
          const assetDate = new Date(asset.creationTime);
          return assetDate >= startOfMonth && assetDate <= endOfMonth;
        });
      }

      if (rawAssets.length === 0) {
        logger.info("PhotoManager", "No photos found for this period");
        if (date && !albumId) {
          handleNoPhotos(date);
        }
        return;
      }

      // Setze sofort die Gesamtanzahl
      setLoadingState((prev) => ({
        ...prev,
        total: rawAssets.length,
        phase: "eager",
      }));

      // Erstelle Platzhalter-Assets mit minimalen Daten
      const placeholderAssets: EnhancedAsset[] = rawAssets.map((asset) => ({
        ...asset,
        uri: asset.uri,
        fileSize: estimatePhotoSize(asset.width, asset.height),
        isLoaded: false,
      }));

      setMonthPhotos(placeholderAssets);

      // Lade die ersten paar Bilder mit vollständigen Infos (Eager Loading)
      const eagerAssets = rawAssets.slice(0, eagerLoadCount);
      const loadedEagerAssets = await processBatch(
        eagerAssets,
        2, // Kleine Batch-Größe für bessere Responsivität
        getAssetInfo,
        (current) => {
          setLoadingState((prev) => ({
            ...prev,
            current,
            phase: "eager",
          }));
        }
      );

      // Ersetze die Platzhalter mit den vollständig geladenen Assets
      setMonthPhotos((prev) => {
        const updated = [...prev];
        loadedEagerAssets.forEach((loadedAsset, index) => {
          if (updated[index]) {
            updated[index] = loadedAsset;
          }
        });
        return updated;
      });

      setLoadingState((prev) => ({
        ...prev,
        phase: "background",
        current: eagerLoadCount,
      }));

      // Lade die restlichen Bilder im Hintergrund
      if (rawAssets.length > eagerLoadCount) {
        const remainingAssets = rawAssets.slice(eagerLoadCount);

        // Verwende setTimeout um den UI-Thread nicht zu blockieren
        setTimeout(async () => {
          const loadedRemainingAssets = await processBatch(
            remainingAssets,
            5, // Größere Batch-Größe für Hintergrund-Loading
            getAssetInfo,
            (current) => {
              setLoadingState((prev) => ({
                ...prev,
                current: eagerLoadCount + current,
                phase:
                  prev.current + current >= prev.total
                    ? "complete"
                    : "background",
              }));
            }
          );

          // Ersetze die restlichen Platzhalter
          setMonthPhotos((prev) => {
            const updated = [...prev];
            loadedRemainingAssets.forEach((loadedAsset, index) => {
              const actualIndex = eagerLoadCount + index;
              if (updated[actualIndex]) {
                updated[actualIndex] = loadedAsset;
              }
            });
            return updated;
          });

          setLoadingState((prev) => ({
            ...prev,
            phase: "complete",
          }));
        }, 100);
      } else {
        setLoadingState((prev) => ({
          ...prev,
          phase: "complete",
        }));
      }

      setIsMonthComplete(false);
      } catch (error) {
        logger.error("PhotoManager", "Error loading photos", error);
      } finally {
        setIsLoading(false);
      }
    };  const handleNoPhotos = async (date: Date) => {
    logger.info("PhotoManager", "Moving to previous month", {
      currentMonth: date.toISOString(),
    });
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    setProcessedMonths((prev) => new Set(prev).add(monthKey));
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    setCurrentMonth(prevMonth);
    await loadPhotos(prevMonth, null);
  };

  // Optimierte Funktion für echte Dateigrößen
  const getActualFileSize = async (asset: EnhancedAsset): Promise<number> => {
    if (
      asset.isLoaded &&
      asset.fileSize &&
      asset.fileSize > estimatePhotoSize(asset.width, asset.height) * 0.8
    ) {
      return asset.fileSize; // Verwende bereits geladene, realistische Größe
    }

    try {
      if (Platform.OS === "ios" && asset.uri.startsWith("file://")) {
        const file = new File(asset.uri);
        try {
          const size = file.size;
          if (size) {
            return size;
          }
        } catch (sizeError) {
          logger.debug("PhotoManager", "Could not get file size with new API", sizeError);
        }
      }

      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
      return (
        // @ts-ignore - fileSize exists in info but not in types
        assetInfo.fileSize ||
        asset.fileSize ||
        estimatePhotoSize(asset.width, asset.height)
      );
    } catch (error) {
      logger.error("PhotoManager", "Error getting actual file size", error);
      return asset.fileSize || estimatePhotoSize(asset.width, asset.height);
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
          const actualSize = await getActualFileSize(currentPhoto);
          // Berechne monthYear basierend auf dem aktuellen Monat
          const monthYear = currentMonth 
            ? `${new Intl.DateTimeFormat("de-DE", { month: "long" }).format(currentMonth)} ${currentMonth.getFullYear()}`
            : undefined;
          
          setPhotosToDelete((prev) => [
            ...prev,
            {
              id: currentPhoto.id,
              uri: currentPhoto.uri,
              fileSize: actualSize,
              monthYear,
            },
          ]);
        }
      } catch (error) {
        logger.error("PhotoManager", "Error adding photo to delete list", error);
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
        const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
        setProcessedMonths((prev) => new Set(prev).add(monthKey));
        await moveToNextMonth();
      } else if (currentAlbumId) {
        await loadPhotos(null, currentAlbumId);
      }

      return true;
    } catch (error) {
      logger.error("PhotoManager", "Error deleting photos", error);
      return false;
    }
  };

  const removeFromDeleteList = (id: string) => {
    setPhotosToDelete((prev) => prev.filter((photo) => photo.id !== id));
  };

  const calculateTotalSize = (photos: PhotoToDelete[]) => {
    return photos.reduce((acc, photo) => acc + (photo.fileSize || 0), 0);
  };

  // Neue Hilfsfunktion: Zähle die verschiedenen Monate
  const getUniqueMonthsCount = (photos: PhotoToDelete[]) => {
    const uniqueMonths = new Set(photos.map(photo => photo.monthYear).filter(Boolean));
    return uniqueMonths.size;
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
      logger.error("PhotoManager", "Error finding previous month with photos", error);
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
    albumId?: string,
    eagerLoadCount: number = 5
  ) => {
    logger.info("PhotoManager", "Initialize month/album", {
      year,
      month,
      albumId,
    });

    try {
      setIsLoading(true);
      if (albumId) {
        setCurrentAlbumId(albumId);
        setCurrentMonth(null);
        await loadPhotos(null, albumId, eagerLoadCount);
      } else {
        setCurrentAlbumId(null);
        const date = new Date(year, month, 1);
        setCurrentMonth(date);
        await loadPhotos(date, null, eagerLoadCount);
      }
    } catch (error) {
      logger.error("PhotoManager", "Error in setInitialMonth", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Neue Funktion: Berechne den nächsten Monat als formatierten String
  const getNextMonthLabel = useCallback(async (): Promise<string | null> => {
    if (!currentMonth || isLastMonth) {
      return null;
    }

    const startOfCurrentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
      0,
      0,
      0
    );

    const nextMonth = await findPreviousMonthWithPhotos(startOfCurrentMonth);
    if (!nextMonth) {
      return null;
    }

    return `${new Intl.DateTimeFormat("de-DE", { month: "long" }).format(nextMonth)} ${nextMonth.getFullYear()}`;
  }, [currentMonth, isLastMonth, findPreviousMonthWithPhotos]);

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
    loadingProgress: loadingState, // Neuer verbesserter Loading State
    setInitialMonth,
    isLastMonth,
    currentAlbumTitle,
    getNextMonthLabel, // Neue Funktion exportieren
    uniqueMonthsCount: getUniqueMonthsCount(photosToDelete), // Neue Funktion exportieren
  };
};
