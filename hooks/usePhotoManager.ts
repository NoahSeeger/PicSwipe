import { useState, useEffect, useCallback, useRef } from "react";
import { Platform, Image, AppState } from "react-native";
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
  phase: "initial" | "loading" | "background" | "complete";
  current: number;
  total: number;
  priorityCount: number; // Wie viele Fotos vor dem ersten Anzeigen geladen werden sollen
};

// Optimierungs-Konstanten
const LOADING_CONSTANTS = {
  // Wie viele Fotos VOLLSTÄNDIG laden bevor UI angezeigt wird
  PRIORITY_LOAD: 5, // 5 Fotos - guter Kompromiss zwischen Speed und Buffer

  // Batch-Größen für paralleles Laden
  PRIORITY_BATCH_SIZE: 5, // Alle Priority-Fotos parallel (schnellst möglich)
  BACKGROUND_BATCH_SIZE: 8, // Optimiert für Balance zwischen Speed und Memory
} as const;

// Paginierung und Prefetching
const PAGINATION = {
  PAGE_SIZE: 100,          // Reduziert für besseres Memory Management
  PREFETCH_THRESHOLD: 15,  // Früher prefetchen für flüssige Experience
} as const;

// Memory Management
const MEMORY_CONSTANTS = {
  MAX_LOADED_ASSETS: 150,  // Maximum Assets im Memory gleichzeitig
  CLEANUP_THRESHOLD: 120,  // Bei dieser Anzahl Cleanup starten
  KEEP_AROUND_CURRENT: 30, // Wie viele Assets um current Index behalten
} as const;

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

// Memory Management: Bereinige Image Cache für nicht mehr benötigte URIs
const cleanupImageCache = (urisToKeep: string[]) => {
  // React Native Image Cache Management
  // Hinweis: Dies ist eine "best effort" Cleanup-Strategie
  // Der native Image Cache wird automatisch bei Memory Pressure geleert
  try {
    // Gib dem System einen Hint, dass wir Memory freigeben wollen
    if (Platform.OS === 'ios') {
      // iOS: Nutze clearMemory wenn verfügbar (manche RN Versionen)
      // @ts-ignore - clearMemoryCache existiert in manchen RN Versionen
      if (Image.clearMemoryCache) {
        // @ts-ignore
        Image.clearMemoryCache();
      }
    }
    logger.debug("PhotoManager", `Cleaned up image cache, keeping ${urisToKeep.length} URIs`);
  } catch (error) {
    logger.debug("PhotoManager", "Image cache cleanup not available", error);
  }
};

// Hilfsfunktion: Entferne weit entfernte Assets aus dem Memory
const trimAssetsAroundIndex = (
  assets: EnhancedAsset[],
  currentIndex: number,
  keepAround: number = MEMORY_CONSTANTS.KEEP_AROUND_CURRENT
): EnhancedAsset[] => {
  if (assets.length <= MEMORY_CONSTANTS.CLEANUP_THRESHOLD) {
    return assets; // Keine Cleanup nötig
  }

  const startKeep = Math.max(0, currentIndex - Math.floor(keepAround / 2));
  const endKeep = Math.min(assets.length, currentIndex + Math.ceil(keepAround / 2));
  
  // Erstelle neue Array mit placeholders für weit entfernte Items
  return assets.map((asset, index) => {
    if (index >= startKeep && index < endKeep) {
      return asset; // Behalte Assets in der Nähe
    }
    // Ersetze weit entfernte Assets mit lightweight placeholders
    if (asset.isLoaded) {
      return {
        ...asset,
        uri: asset.uri, // URI behalten für Reload wenn nötig
        isLoaded: false,
        fileSize: estimatePhotoSize(asset.width, asset.height),
      };
    }
    return asset;
  });
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
      }
    });

    onProgress?.(Math.min(i + batchSize, items.length), items.length);
  }

  return results;
};

export const usePhotoManager = () => {
  // useRef zum Verhindern von doppelten Load-Aufrufen
  const loadingRef = useRef(false);
  // Eindeutige Load-ID zur Vermeidung von Race Conditions, wenn mehrfach schnell geladen wird
  const loadIdRef = useRef(0);
  // Cursor und Paging-Status
  const cursorRef = useRef<string | null>(null);
  const hasNextPageRef = useRef<boolean>(false);
  const fetchingNextPageRef = useRef<boolean>(false);
  const currentAlbumRef = useRef<MediaLibrary.Album | null>(null);
  // Abort Controller für Cleanup bei Navigation
  const abortControllerRef = useRef<AbortController | null>(null);
  // Mounted State
  const isMountedRef = useRef(true);
  // Memory Cleanup Timer
  const cleanupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Background Loading Promise - um es garantiert abzubrechen
  const backgroundLoadingRef = useRef<Promise<void> | null>(null);
  
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
    priorityCount: 0,
  });
  const [processedMonths, setProcessedMonths] = useState<Set<string>>(
    new Set()
  );
  const [isLastMonth, setIsLastMonth] = useState(false);

  // Aktuelle Monatsrange für Paginierung merken
  const currentRangeRef = useRef<{ start?: number; end?: number } | null>(null);

  // Helper: nächste Seite laden und in Hintergrund verarbeiten
  const fetchNextPageAndQueue = useCallback(async () => {
    if (!hasNextPageRef.current || fetchingNextPageRef.current || !isMountedRef.current) return;
    fetchingNextPageRef.current = true;
    const myLoadId = loadIdRef.current;
    const myAbortController = abortControllerRef.current;

    try {
      const baseOptions: MediaLibrary.AssetsOptions = {
        mediaType: MediaLibrary.MediaType.photo,
        first: PAGINATION.PAGE_SIZE,
        sortBy: MediaLibrary.SortBy.creationTime,
        after: cursorRef.current ?? undefined,
      };

      let result;
      if (currentAlbumRef.current) {
        result = await MediaLibrary.getAssetsAsync({
          ...baseOptions,
          album: currentAlbumRef.current,
        });
      } else if (currentRangeRef.current?.start !== undefined && currentRangeRef.current?.end !== undefined) {
        result = await MediaLibrary.getAssetsAsync({
          ...baseOptions,
          createdAfter: currentRangeRef.current.start,
          createdBefore: currentRangeRef.current.end,
        });
      } else {
        return; // keine gültige Query
      }

      const { assets, endCursor, hasNextPage } = result;
      if (!assets || assets.length === 0) {
        hasNextPageRef.current = false;
        return;
      }

      // Check abort/new session
      if (!isMountedRef.current || myAbortController?.signal.aborted || loadIdRef.current !== myLoadId) {
        logger.debug("PhotoManager", "Next page fetch aborted");
        return;
      }

      // Platzhalter anhängen
      const placeholders: EnhancedAsset[] = assets.map((asset) => ({
        ...asset,
        uri: asset.uri,
        fileSize: estimatePhotoSize(asset.width, asset.height),
        isLoaded: false,
      }));

      setMonthPhotos((prev) => {
        const next = [...prev, ...placeholders];
        setLoadingState((s) => ({ ...s, total: next.length }));
        return next;
      });

      // Im Hintergrund in Batches echte Infos laden
      for (let i = 0; i < assets.length; i += LOADING_CONSTANTS.BACKGROUND_BATCH_SIZE) {
        // Check abort vor jedem Batch
        if (!isMountedRef.current || myAbortController?.signal.aborted || loadIdRef.current !== myLoadId) {
          return;
        }

        const batch = assets.slice(i, i + LOADING_CONSTANTS.BACKGROUND_BATCH_SIZE);
        const batchResults = await Promise.allSettled(batch.map(getAssetInfo));

        // Check abort nach Batch
        if (!isMountedRef.current || myAbortController?.signal.aborted || loadIdRef.current !== myLoadId) {
          return;
        }

        setMonthPhotos((prev) => {
          const updated = [...prev];
          batchResults.forEach((res, localIndex) => {
            if (res.status === "fulfilled") {
              const globalIndex = prev.length - assets.length + i + localIndex; // Startposition der angehängten Seite
              if (updated[globalIndex]) {
                updated[globalIndex] = res.value;
              }
            }
          });
          return updated;
        });

        setLoadingState((prev) => {
          const additionalLoaded = Math.min(i + LOADING_CONSTANTS.BACKGROUND_BATCH_SIZE, assets.length);
          const nextCurrent = Math.min(prev.current + additionalLoaded, prev.total);
          const nextPhase = hasNextPageRef.current || nextCurrent < prev.total ? "background" : "complete";
          return { ...prev, current: nextCurrent, phase: nextPhase };
        });
      }

      cursorRef.current = endCursor ?? null;
      hasNextPageRef.current = !!hasNextPage;
    } catch (e) {
      logger.error("PhotoManager", "Error fetching next page", e);
    } finally {
      fetchingNextPageRef.current = false;
    }
  }, []);

  const loadPhotos = async (
    date: Date | null = currentMonth,
    albumId: string | null = currentAlbumId,
    priorityCount: number = LOADING_CONSTANTS.PRIORITY_LOAD
  ) => {
    // Abort laufende Operationen
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      logger.debug("PhotoManager", "Aborted previous load operation");
    }
    abortControllerRef.current = new AbortController();

    if (loadingRef.current) {
      logger.warn("PhotoManager", "Ignoring duplicate load request");
      return;
    }

    loadingRef.current = true;
    const myLoadId = ++loadIdRef.current; // neue Lade-Session
    const myAbortController = abortControllerRef.current;
    let pageAssets: MediaLibrary.Asset[] = [];

    // Cleanup vorherige Assets und Image Cache
    if (monthPhotos.length > 0) {
      logger.debug("PhotoManager", `Cleaning up ${monthPhotos.length} previous assets`);
      cleanupImageCache([]); // Clear all
      setMonthPhotos([]);
    }

    try {
      logger.info("PhotoManager", `Loading photos for ${date ? 'month' : 'album'}`, {
        albumId,
        month: date?.toISOString(),
      });
      
      setIsLoading(true);
      setLoadingState((_) => ({
        phase: "initial",
        current: 0,
        total: 0,
        priorityCount,
      }));
      // Leere Platzhalter für Priority-Fotos anlegen, damit Progress-Bar sinnvoll updaten kann
      setMonthPhotos([]);
      setCurrentIndex(0);
      setPreviousPhoto(null);

      // Reset Paginierung
      cursorRef.current = null;
      hasNextPageRef.current = false;
      fetchingNextPageRef.current = false;
      currentAlbumRef.current = null;

      // Basiskonfiguration mit Paginierung
      const baseOptions: MediaLibrary.AssetsOptions = {
        mediaType: MediaLibrary.MediaType.photo,
        first: PAGINATION.PAGE_SIZE,
        sortBy: MediaLibrary.SortBy.creationTime,
      };

      // Lade Assets basierend auf Album oder Datum – gefiltert vom System, nicht in JS
      if (albumId) {
        console.log("Loading paged photos from album:", albumId);
        const albums = await MediaLibrary.getAlbumsAsync();
        const album = albums.find((a) => a.id === albumId);
        if (!album) {
          console.error("Album not found:", albumId);
          return;
        }
        currentAlbumRef.current = album;
        currentRangeRef.current = null;
        setCurrentAlbumTitle(album.title);

        const { assets, endCursor, hasNextPage } = await MediaLibrary.getAssetsAsync({
          ...baseOptions,
          album: album,
        });
        pageAssets = assets;
        cursorRef.current = endCursor ?? null;
        hasNextPageRef.current = !!hasNextPage;
      } else if (date) {
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        currentRangeRef.current = {
          start: startOfMonth.getTime(),
          end: endOfMonth.getTime(),
        };

        const { assets, endCursor, hasNextPage } = await MediaLibrary.getAssetsAsync({
          ...baseOptions,
          createdAfter: startOfMonth.getTime(),
          createdBefore: endOfMonth.getTime(),
        });
        pageAssets = assets;
        cursorRef.current = endCursor ?? null;
        hasNextPageRef.current = !!hasNextPage;
      }

      if (pageAssets.length === 0) {
        logger.info("PhotoManager", "No photos found for this period");
        if (date && !albumId) {
          handleNoPhotos(date);
        }
        return;
      }

      // Check abort
      if (myAbortController.signal.aborted || loadIdRef.current !== myLoadId) {
        logger.debug("PhotoManager", "Load operation was aborted");
        return;
      }

      logger.info("PhotoManager", `Loading ${pageAssets.length} photos: ${priorityCount} priority, rest in background`);

      setLoadingState((prev) => ({
        ...prev,
        total: pageAssets.length,
        phase: "loading",
      }));

      // PHASE 1: Lade Priority-Fotos – ALLE 5 PARALLEL für maximale Geschwindigkeit
      const priorityAssets = pageAssets.slice(0, priorityCount);

      // STRATEGIE: Lade ALLE 5 Priority-Fotos PARALLEL (nicht sequenziell!)
      // Dies ist der schnellste Weg und gibt konsistente Performance
      const loadedPriorityPhotos: (EnhancedAsset | null)[] = new Array(priorityCount).fill(null);
      
      const priorityPromises = priorityAssets.map(async (asset, index) => {
        try {
          const result = await getAssetInfo(asset);
          
          // Check abort
          if (myAbortController.signal.aborted || loadIdRef.current !== myLoadId) {
            return null;
          }

          loadedPriorityPhotos[index] = result;

          // Live-Update: Zeige jedes geladene Foto sofort
          setMonthPhotos((prev) => {
            const updated = [...loadedPriorityPhotos.filter(Boolean)] as EnhancedAsset[];
            return updated;
          });

          // Progress Update
          setLoadingState((prev) => {
            const loadedCount = loadedPriorityPhotos.filter(Boolean).length;
            return {
              ...prev,
              current: loadedCount,
              phase: loadedCount >= priorityCount ? "background" : "loading",
            };
          });

          return result;
        } catch (error) {
          logger.error("PhotoManager", `Error loading priority asset ${index}`, error);
          return null;
        }
      });

      await Promise.all(priorityPromises);

      // Check abort nach Priority Load
      if (myAbortController.signal.aborted || loadIdRef.current !== myLoadId) {
        logger.debug("PhotoManager", "Priority load was aborted");
        return;
      }

      // Filter null values
      const validPriorityPhotos = loadedPriorityPhotos.filter(Boolean) as EnhancedAsset[];
      setMonthPhotos(validPriorityPhotos);

      logger.info("PhotoManager", `✅ Priority photos loaded: ${validPriorityPhotos.length}/${priorityCount}`);

      // Nach Priority-Phase: UI ist ready
      setIsLoading(false);

      // PHASE 2: Lade Rest im Hintergrund mit GARANTIERTEM Abort-Support
      if (pageAssets.length > priorityCount) {
        const remainingAssets = pageAssets.slice(priorityCount);
        
        logger.info("PhotoManager", `Background loading ${remainingAssets.length} remaining photos`);

        // Füge Platzhalter hinzu
        const remainingPlaceholders: EnhancedAsset[] = remainingAssets.map((asset) => ({
          ...asset,
          uri: asset.uri,
          fileSize: estimatePhotoSize(asset.width, asset.height),
          isLoaded: false,
        }));
        
        setMonthPhotos((prev) => {
          const next = [...prev, ...remainingPlaceholders];
          setLoadingState((s) => ({ ...s, total: next.length, phase: "background" }));
          return next;
        });

        // 🔥 Background Loading mit Promise-Tracking für garantierten Stop
        const startBackgroundLoading = () => {
          let promise: Promise<void> | null = null;
          
          promise = (async () => {
            try {
              for (let i = 0; i < remainingAssets.length; i += LOADING_CONSTANTS.BACKGROUND_BATCH_SIZE) {
                // ✅ Check abort vor jedem Batch
                if (myAbortController.signal.aborted || loadIdRef.current !== myLoadId || !isMountedRef.current) {
                  logger.info("PhotoManager", "⏹️ Background loading stopped (abort detected)");
                  return;
                }

                const batch = remainingAssets.slice(i, i + LOADING_CONSTANTS.BACKGROUND_BATCH_SIZE);
                const batchResults = await Promise.allSettled(
                  batch.map(asset => getAssetInfo(asset))
                );

                // ✅ Check abort nach Batch
                if (myAbortController.signal.aborted || loadIdRef.current !== myLoadId || !isMountedRef.current) {
                  logger.info("PhotoManager", "⏹️ Background loading stopped (abort after batch)");
                  return;
                }

                // Update nur wenn noch mounted und nicht aborted
                if (isMountedRef.current && loadIdRef.current === myLoadId) {
                  setMonthPhotos((prev) => {
                    const updated = [...prev];
                    batchResults.forEach((res, localIndex) => {
                      if (res.status === "fulfilled") {
                        const globalIndex = priorityCount + i + localIndex;
                        if (globalIndex < updated.length) {
                          updated[globalIndex] = res.value;
                        }
                      }
                    });
                    return updated;
                  });

                  const loadedInBatch = batchResults.filter(r => r.status === "fulfilled").length;
                  setLoadingState((prev) => {
                    const nextCurrent = Math.min(prev.current + loadedInBatch, prev.total);
                    const nextPhase = nextCurrent >= prev.total ? "complete" : "background";
                    return { ...prev, current: nextCurrent, phase: nextPhase };
                  });
                }

                // Kleine Pause zwischen Batches um UI responsive zu halten
                await new Promise(resolve => setTimeout(resolve, 10));
              }
              
              logger.info("PhotoManager", "✅ Background loading complete");
            } catch (error) {
              logger.error("PhotoManager", "Background loading error", error);
            } finally {
              // Cleanup: Entferne Promise-Referenz wenn es noch das aktuelle ist
              if (promise && backgroundLoadingRef.current === promise) {
                backgroundLoadingRef.current = null;
              }
            }
          })();
          
          // 🔥 Speichere Promise-Referenz um es später abzubrechen
          backgroundLoadingRef.current = promise;
        };
        
        startBackgroundLoading();
      } else {
        // Alles in Priority enthalten
        setLoadingState((prev) => ({
          ...prev,
          phase: "complete",
          current: prev.total,
        }));
      }

      setIsMonthComplete(false);
    } catch (error) {
      logger.error("PhotoManager", "Error loading photos", error);
    } finally {
      loadingRef.current = false;
      // Setze isLoading nur auf false wenn keine Fotos gefunden wurden
      if (pageAssets.length === 0) {
        setIsLoading(false);
      }
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

    // 🛑 KRITISCH: Prüfe ob nächstes Foto geladen ist
    const nextIndex = currentIndex + 1;
    const nextPhoto = monthPhotos[nextIndex];
    
    // Wenn nächstes Foto existiert aber NICHT geladen ist, BLOCKIERE Swipe!
    if (nextPhoto && !nextPhoto.isLoaded) {
      logger.warn("PhotoManager", `⏸️ Blocked swipe: Next photo (index ${nextIndex}) not loaded yet`);
      // User MUSS warten bis Foto geladen ist
      return;
    }

    setPreviousPhoto(currentPhoto);

    // Memory Management: Cleanup wenn zu viele Assets im Memory
    if (monthPhotos.length > MEMORY_CONSTANTS.CLEANUP_THRESHOLD && 
        currentIndex % 10 === 0) { // Nur alle 10 Fotos cleanup
      const trimmed = trimAssetsAroundIndex(monthPhotos, currentIndex + 1);
      if (trimmed !== monthPhotos) {
        setMonthPhotos(trimmed);
        // Cleanup Image Cache
        const urisToKeep = trimmed
          .slice(
            Math.max(0, currentIndex - 15),
            Math.min(trimmed.length, currentIndex + 15)
          )
          .map(a => a.uri);
        cleanupImageCache(urisToKeep);
      }
    }

    if (addToDeleteList) {
      // 🛑 SICHERHEITS-CHECK: Nur geladene Fotos dürfen gelöscht werden!
      if (!currentPhoto.isLoaded) {
        logger.error("PhotoManager", "⛔ CRITICAL: Attempted to delete unloaded photo!", {
          id: currentPhoto.id,
          index: currentIndex
        });
        // BLOCKIERE Löschung von nicht-geladenen Fotos!
        return;
      }
      
      try {
        // Synchroner Check BEVOR wir async operations machen
        const isDuplicate = photosToDelete.some(
          (photo) => photo.id === currentPhoto.id
        );
        
        if (!isDuplicate) {
          const actualSize = await getActualFileSize(currentPhoto);
          // Berechne monthYear basierend auf dem aktuellen Monat
          const monthYear = currentMonth 
            ? `${new Intl.DateTimeFormat("de-DE", { month: "long" }).format(currentMonth)} ${currentMonth.getFullYear()}`
            : undefined;
          
          // Nochmal checken nach async operation (Race Condition Prevention)
          setPhotosToDelete((prev) => {
            const stillNoDuplicate = !prev.some(p => p.id === currentPhoto.id);
            if (stillNoDuplicate) {
              return [
                ...prev,
                {
                  id: currentPhoto.id,
                  uri: currentPhoto.uri,
                  fileSize: actualSize,
                  monthYear,
                },
              ];
            }
            return prev;
          });
        }
      } catch (error) {
        logger.error("PhotoManager", "Error adding photo to delete list", error);
      }
    }

    // Prefetch nächste Seite wenn wir uns dem Ende nähern
    if (monthPhotos.length - currentIndex <= PAGINATION.PREFETCH_THRESHOLD) {
      fetchNextPageAndQueue();
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

      // Do NOT reload month, just update state and let UI continue
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
    priorityCount: number = LOADING_CONSTANTS.PRIORITY_LOAD
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
        await loadPhotos(null, albumId, priorityCount);
      } else {
        setCurrentAlbumId(null);
        const date = new Date(year, month, 1);
        setCurrentMonth(date);
        await loadPhotos(date, null, priorityCount);
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

  // 🚀 NEU: Prefetch nächsten Monat im Hintergrund (für MonthCompleteScreen)
  const prefetchNextMonth = useCallback(async (): Promise<boolean> => {
    if (!currentMonth || isLastMonth) {
      return false;
    }

    try {
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
        return false;
      }

      logger.info("PhotoManager", "🚀 Prefetching next month", {
        nextMonth: nextMonth.toISOString(),
      });

      // Lade nur die Asset-IDs (keine URIs) um Memory zu sparen
      const startOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
      startOfNextMonth.setHours(0, 0, 0, 0);
      const endOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
      endOfNextMonth.setHours(23, 59, 59, 999);

      // Hole erste Seite Assets
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: LOADING_CONSTANTS.PRIORITY_LOAD, // Nur erste 5
        sortBy: MediaLibrary.SortBy.creationTime,
        createdAfter: startOfNextMonth.getTime(),
        createdBefore: endOfNextMonth.getTime(),
      });

      if (assets.length === 0) {
        return false;
      }

      // Lade die ersten 5 Fotos PARALLEL im Hintergrund
      // Dies füllt den OS Cache, sodass beim echten Laden alles instant ist
      const prefetchPromises = assets.slice(0, LOADING_CONSTANTS.PRIORITY_LOAD).map(async (asset) => {
        try {
          await getAssetInfo(asset);
        } catch (error) {
          logger.debug("PhotoManager", "Prefetch error (non-critical)", error);
        }
      });

      await Promise.allSettled(prefetchPromises);

      logger.info("PhotoManager", "✅ Prefetch complete", {
        prefetchedCount: assets.length,
      });

      return true;
    } catch (error) {
      logger.error("PhotoManager", "Prefetch error", error);
      return false;
    }
  }, [currentMonth, isLastMonth, findPreviousMonthWithPhotos]);

  // Cleanup bei Unmount
  useEffect(() => {
    isMountedRef.current = true;

    // Cleanup timer für Memory Management
    const startMemoryMonitoring = () => {
      // Prüfe alle 30 Sekunden ob Cleanup nötig ist
      cleanupTimerRef.current = setInterval(() => {
        if (monthPhotos.length > MEMORY_CONSTANTS.CLEANUP_THRESHOLD) {
          logger.debug("PhotoManager", "Periodic memory cleanup triggered");
          const trimmed = trimAssetsAroundIndex(monthPhotos, currentIndex);
          if (trimmed !== monthPhotos) {
            setMonthPhotos(trimmed);
          }
        }
      }, 30000);
    };

    startMemoryMonitoring();

    return () => {
      isMountedRef.current = false;
      
      logger.info("PhotoManager", "🧹 Component unmounting - full cleanup");
      
      // 🔥 Abort laufende Operationen
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 🔥 Background Loading wird automatisch durch isMountedRef.current = false gestoppt
      // Promise läuft aus aber macht keine State-Updates mehr
      
      // Clear timer
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
      
      // Final cleanup
      cleanupImageCache([]);
    };
  }, []);

  const currentPhoto = monthPhotos[currentIndex];
  const nextPhotos = monthPhotos.slice(currentIndex + 1, currentIndex + 3);
  
  // 🚨 Expose: Ist nächstes Foto geladen?
  const isNextPhotoLoading = (() => {
    const nextPhoto = monthPhotos[currentIndex + 1];
    return nextPhoto ? !nextPhoto.isLoaded : false;
  })();
  
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
    isNextPhotoLoading, // 🔥 NEU: Zeigt ob nächstes Foto noch lädt
    prefetchNextMonth, // 🚀 NEU: Prefetch nächsten Monat für schnelleren Wechsel
  };
};
