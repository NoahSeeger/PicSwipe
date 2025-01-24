import { useState, useEffect, useCallback } from "react";
import * as MediaLibrary from "expo-media-library";

export type PhotoToDelete = {
  id: string;
  uri: string;
  fileSize?: number;
};

export const usePhotoManager = () => {
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [monthPhotos, setMonthPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photosToDelete, setPhotosToDelete] = useState<PhotoToDelete[]>([]);
  const [previousPhoto, setPreviousPhoto] = useState<MediaLibrary.Asset | null>(
    null
  );
  const [isMonthComplete, setIsMonthComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processedMonths, setProcessedMonths] = useState<Set<string>>(
    new Set()
  );
  const [isLastMonth, setIsLastMonth] = useState(false);

  const loadMonthPhotos = async (date: Date = currentMonth || new Date()) => {
    if (!date) return;

    try {
      console.log("Loading photos for date:", {
        year: date.getFullYear(),
        month: date.getMonth(),
        fullDate: date.toISOString(),
      });

      setIsLoading(true);
      setMonthPhotos([]);
      setCurrentIndex(0);
      setPhotosToDelete([]);

      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      console.log("Date range:", {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      });

      // Hole zuerst alle Fotos für den Monat
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 999999,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      // Filtere die Fotos manuell nach dem Datum
      const monthAssets = assets.filter((asset) => {
        const assetDate = new Date(asset.creationTime);
        return assetDate >= startOfMonth && assetDate <= endOfMonth;
      });

      console.log("Found photos:", {
        total: assets.length,
        forMonth: monthAssets.length,
        targetMonth: date.getMonth(),
        targetYear: date.getFullYear(),
      });

      if (monthAssets.length > 0) {
        // Lade die Asset-Informationen
        const loadedAssets = await Promise.all(
          monthAssets.map(async (asset) => {
            try {
              const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
              return {
                ...assetInfo,
                uri: assetInfo.localUri || assetInfo.uri,
              };
            } catch (error) {
              console.error("Error loading asset info:", error);
              return asset;
            }
          })
        );

        setMonthPhotos(loadedAssets);
        setIsMonthComplete(false);
      } else {
        console.log("No photos found for month:", {
          year: date.getFullYear(),
          month: date.getMonth(),
        });
        handleNoPhotos(date);
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Hilfsfunktion für den Fall, dass keine Fotos gefunden wurden
  const handleNoPhotos = async (date: Date) => {
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    setProcessedMonths((prev) => new Set(prev).add(monthKey));
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    setCurrentMonth(prevMonth);
    await loadMonthPhotos(prevMonth);
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
        // Prüfe ob das Foto bereits in der Liste ist
        const isDuplicate = photosToDelete.some(
          (photo) => photo.id === currentPhoto.id
        );
        if (!isDuplicate) {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(
            currentPhoto.id,
            {
              shouldDownloadFromNetwork: true,
            }
          );

          // Schätze die Dateigröße basierend auf der Bildgröße
          let estimatedSize = 0;
          if (assetInfo.width && assetInfo.height) {
            // Grobe Schätzung: 3 Byte pro Pixel für JPEG
            estimatedSize =
              (assetInfo.width * assetInfo.height * 3) / 1024 / 1024; // in MB

            // Berücksichtige den Bildtyp
            if (assetInfo.filename?.toLowerCase().endsWith("heic")) {
              estimatedSize *= 0.5; // HEIC ist effizienter
            } else if (assetInfo.filename?.toLowerCase().endsWith("png")) {
              estimatedSize *= 1.5; // PNG ist größer
            }
          }

          console.log("Estimated size:", estimatedSize, "MB");

          setPhotosToDelete((prev) => [
            ...prev,
            {
              id: currentPhoto.id,
              uri: currentPhoto.uri,
              fileSize: Math.round(estimatedSize * 1024 * 1024),
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

      // Markiere aktuellen Monat als verarbeitet und gehe zum nächsten
      const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
      setProcessedMonths((prev) => new Set(prev).add(monthKey));
      await moveToNextMonth();

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
    return photos.reduce((acc, photo) => {
      console.log("Photo size:", photo.fileSize); // Debug log
      return acc + (photo.fileSize || 0);
    }, 0);
  };

  // Hilfsfunktion zum Finden des nächsten älteren Monats mit Fotos
  const findPreviousMonthWithPhotos = useCallback(async (startDate: Date) => {
    try {
      // Hole das erste Foto VOR dem aktuellen Monat
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 1,
        createdBefore: startDate.getTime(),
        sortBy: MediaLibrary.SortBy.creationTime,
        // Die Sortierung wird durch die Reihenfolge der Fotos bestimmt
        // und createdBefore stellt sicher, dass wir ältere Fotos bekommen
      });

      if (assets.length === 0) {
        return null;
      }

      // Wenn wir ein Foto finden, bestimme seinen Monat
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

    // Wenn der vorherige Monat mit Fotos gefunden wurde
    setCurrentMonth(previousMonthWithPhotos);
    await loadMonthPhotos(previousMonthWithPhotos);
  }, [currentMonth, findPreviousMonthWithPhotos, loadMonthPhotos]);

  // checkIfLastMonth prüft jetzt, ob es ältere Monate gibt
  const checkIfLastMonth = useCallback(
    async (date: Date) => {
      if (!date) return true;

      const startOfMonth = new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
        0,
        0,
        0
      );

      const previousMonthWithPhotos = await findPreviousMonthWithPhotos(
        startOfMonth
      );
      return previousMonthWithPhotos === null;
    },
    [findPreviousMonthWithPhotos]
  );

  const setInitialMonth = async (year: number, month: number) => {
    console.log("PhotoManager: setInitialMonth called", { year, month });

    try {
      setIsLoading(true);
      const date = new Date(year, month, 1);
      console.log("PhotoManager: Created date object:", date.toISOString());

      setCurrentMonth(date);

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      console.log("PhotoManager: Querying photos between:", {
        start: startOfMonth.toLocaleString(),
        end: endOfMonth.toLocaleString(),
      });

      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 999999,
        createdAfter: startOfMonth.getTime(),
        createdBefore: endOfMonth.getTime(),
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      console.log("PhotoManager: Initial query results:", {
        totalAssets: assets.length,
        firstAssetDate: assets[0]?.creationTime
          ? new Date(assets[0].creationTime).toLocaleString()
          : "none",
        lastAssetDate: assets[assets.length - 1]?.creationTime
          ? new Date(assets[assets.length - 1].creationTime).toLocaleString()
          : "none",
      });

      if (assets.length > 0) {
        console.log("PhotoManager: Loading detailed asset info...");
        const loadedAssets = await Promise.all(
          assets.map(async (asset) => {
            try {
              const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
              return {
                ...assetInfo,
                uri: assetInfo.localUri || assetInfo.uri,
              };
            } catch (error) {
              console.error("PhotoManager: Error loading asset info:", error);
              return asset;
            }
          })
        );

        console.log("PhotoManager: Setting state with loaded assets:", {
          count: loadedAssets.length,
        });

        setMonthPhotos(loadedAssets);
        setCurrentIndex(0);
        setIsMonthComplete(false);
      } else {
        console.log("PhotoManager: No photos found, resetting state");
        setMonthPhotos([]);
        setCurrentIndex(0);
        setIsMonthComplete(true);
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
    loadMonthPhotos,
    progress,
    removeFromDeleteList,
    totalSize: calculateTotalSize(photosToDelete),
    isMonthComplete,
    currentMonth: currentMonth || new Date(),
    moveToNextMonth,
    isLoading,
    setInitialMonth,
    isLastMonth,
  };
};
