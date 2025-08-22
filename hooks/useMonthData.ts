import { useState, useEffect } from "react";
import * as MediaLibrary from "expo-media-library";
import type { PermissionStatus } from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "month_overview_cache";
const CACHE_TIMESTAMP_KEY = "month_overview_timestamp";
const CACHE_DURATION = 1000 * 60 * 60; // 1 Stunde

export type YearData = {
  year: number;
  months: {
    month: string;
    monthIndex: number;
    photoCount: number;
    isProcessed: boolean;
    thumbnailUri?: string;
  }[];
  totalPhotos: number;
  thumbnailUri?: string;
};

export type LoadingState = 'initial' | 'loading-photos' | 'processing-years' | 'loading-thumbnails' | 'complete';

export const useMonthData = () => {
  const [yearData, setYearData] = useState<YearData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [progress, setProgress] = useState(0); // 0-100%

  // Generiert eine schnelle Übersicht der Jahre aus Assets ohne Thumbnails
  const generateYearDataFromAssets = (
    assets: MediaLibrary.Asset[],
    existingThumbnails: Map<number, string>
  ): YearData[] => {
    const yearMap = new Map<
      number,
      {
        months: Map<
          number,
          {
            count: number;
          }
        >;
      }
    >();
    
    assets.forEach((asset) => {
      const dateObj = new Date(asset.creationTime);
      if (isNaN(dateObj.getTime())) return;
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      if (!yearMap.has(year)) yearMap.set(year, { months: new Map() });
      const yearData = yearMap.get(year)!;
      if (!yearData.months.has(month)) yearData.months.set(month, { count: 0 });
      yearData.months.get(month)!.count++;
    });
    
    const sortedYears = Array.from(yearMap.entries())
      .sort(([yearA], [yearB]) => yearB - yearA)
      .map(([year, data]) => {
        const months = Array.from(data.months.entries())
          .sort(([monthA], [monthB]) => monthB - monthA)
          .map(([monthIndex, monthData]) => {
            return {
              month: new Intl.DateTimeFormat("de-DE", {
                month: "long",
              }).format(new Date(year, monthIndex)),
              monthIndex,
              photoCount: monthData.count,
              isProcessed: false,
              thumbnailUri: undefined,
            };
          });

        return {
          year,
          months,
          totalPhotos: months.reduce((sum, month) => sum + month.photoCount, 0),
          thumbnailUri: existingThumbnails.get(year),
        };
      });
      
    return sortedYears;
  };
  
  // Vollständige Verarbeitung der Asset-Daten mit Thumbnails
  const processYearData = async (assets: MediaLibrary.Asset[]): Promise<YearData[]> => {
    setLoadingState('processing-years');
    
    const yearMap = new Map<
      number,
      {
        months: Map<
          number,
          {
            count: number;
          }
        >;
      }
    >();
    
    // --- RANDOM THUMBNAIL CACHING FÜR JAHRE UND MONATE ---
    const YEAR_THUMB_CACHE_KEY = 'year_thumbnails_cache_v2';
    const MONTH_THUMB_CACHE_KEY = ''; // Monats-Thumbnails werden nicht mehr geladen
    let cachedYearThumbnails: Record<string, { assetId: string; uri: string }> = {};
    try {
      const cacheRaw = await AsyncStorage.getItem(YEAR_THUMB_CACHE_KEY);
      if (cacheRaw) cachedYearThumbnails = JSON.parse(cacheRaw);
    } catch {}

    // Sammle alle Asset-IDs pro Jahr und pro Monat
    const yearAssetIds = new Map<number, string[]>();
    assets.forEach((asset) => {
      const dateObj = new Date(asset.creationTime);
      if (isNaN(dateObj.getTime())) return;
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      if (!yearAssetIds.has(year)) yearAssetIds.set(year, []);
      yearAssetIds.get(year)!.push(asset.id);
      if (!yearMap.has(year)) yearMap.set(year, { months: new Map() });
      const yearData = yearMap.get(year)!;
      if (!yearData.months.has(month)) yearData.months.set(month, { count: 0 });
      yearData.months.get(month)!.count++;
    });
    
    setLoadingState('loading-thumbnails');
    
    // Wähle für jedes Jahr ein zufälliges Asset als Thumbnail (cached, wenn möglich)
    const yearThumbnails = new Map<number, string>();
    const newYearCache: Record<string, { assetId: string; uri: string }> = {};
    let processedYears = 0;
    const totalYears = yearAssetIds.size;
    
    for (const [year, assetIds] of yearAssetIds.entries()) {
      let chosenAssetId = '';
      if (cachedYearThumbnails[year] && assetIds.includes(cachedYearThumbnails[year].assetId)) {
        chosenAssetId = cachedYearThumbnails[year].assetId;
        yearThumbnails.set(year, cachedYearThumbnails[year].uri);
        newYearCache[year] = cachedYearThumbnails[year];
      } else if (assetIds.length > 0) {
        chosenAssetId = assetIds[Math.floor(Math.random() * assetIds.length)];
        try {
          const assetInfo = await MediaLibrary.getAssetInfoAsync(chosenAssetId);
          const uri = assetInfo.localUri || assetInfo.uri;
          yearThumbnails.set(year, uri);
          newYearCache[year] = { assetId: chosenAssetId, uri };
        } catch {}
      }
      
      // Fortschritt während der Thumbnail-Ladung aktualisieren
      processedYears++;
      const thumbnailProgress = Math.floor(90 + ((processedYears / totalYears) * 10));
      setProgress(thumbnailProgress);
    }
    
    // Cache aktualisieren für Jahr-Thumbnails
    try {
      await AsyncStorage.setItem(YEAR_THUMB_CACHE_KEY, JSON.stringify(newYearCache));
    } catch {}
    
    // Wähle für jeden Monat ein zufälliges Asset als Thumbnail (nicht mehr implementiert)
    const monthThumbnails = new Map<string, string>();
    
    const sortedYears = Array.from(yearMap.entries())
      .sort(([yearA], [yearB]) => yearB - yearA)
      .map(([year, data]) => {
        const months = Array.from(data.months.entries())
          .sort(([monthA], [monthB]) => monthB - monthA)
          .map(([monthIndex, monthData]) => {
            const monthKey = `${year}-${monthIndex}`;
            return {
              month: new Intl.DateTimeFormat("de-DE", {
                month: "long",
              }).format(new Date(year, monthIndex)),
              monthIndex,
              photoCount: monthData.count,
              isProcessed: false,
              thumbnailUri: monthThumbnails.get(monthKey),
            };
          });

        return {
          year,
          months,
          totalPhotos: months.reduce(
            (sum, month) => sum + month.photoCount,
            0
          ),
          thumbnailUri: yearThumbnails.get(year),
        };
      });

    const totalPhotos = sortedYears.reduce(
      (sum, year) => sum + year.totalPhotos,
      0
    );
    console.log("Photo statistics:", {
      totalYears: sortedYears.length,
      totalPhotos,
      yearsRange: `${sortedYears[sortedYears.length - 1]?.year} - ${
        sortedYears[0]?.year
      }`,
    });
    
    return sortedYears;
  };

  const loadMonthData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setLoadingState('initial');
      setProgress(0);

      const { status } = await MediaLibrary.getPermissionsAsync();
      // Support für SDKs ohne "limited": akzeptiere "granted" oder eine evtl. vorhandene "limited"-Konstante
      if (
        status !== "granted" &&
        (status as unknown as PermissionStatus) !==
          ("limited" as unknown as PermissionStatus)
      ) {
        return;
      }
      
      // Versuche zuerst aus dem Cache zu laden
      try {
        const timestampStr = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        
        if (!forceRefresh && timestampStr && cachedData) {
          const timestamp = parseInt(timestampStr);
          const now = Date.now();
          
          // Wenn der Cache frisch genug ist, nutze ihn
          if (now - timestamp < CACHE_DURATION) {
            const parsedData = JSON.parse(cachedData);
            setYearData(parsedData);
            setLoadingState('complete');
            setProgress(100);
            setIsLoading(false);
            
            // Aktualisiere im Hintergrund
            setTimeout(() => loadMonthData(true), 100);
            return;
          }
        }
      } catch (error) {
        console.log("Cache loading error:", error);
      }

      // Progressive Datenladung mit kleineren Batches
      setLoadingState('loading-photos');
      
      const BATCH_SIZE = 10000; // Kleinere Batch-Größe für bessere Performance
      let allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;
      let totalPhotosCount = 0;
      let batchCount = 0;

      // Prüfen, wie viele Fotos insgesamt vorhanden sind
      const { totalCount } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 1,
      });

      while (hasNextPage) {
        console.log("Fetching photos batch", batchCount + 1, "after:", after);
        const { assets, hasNextPage: more } = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          first: BATCH_SIZE,
          after,
          sortBy: MediaLibrary.SortBy.creationTime,
        });

        if (assets.length > 0) {
          allAssets = [...allAssets, ...assets];
          
          // Einen ersten Schnellüberblick nach jedem Batch erstellen
          if (allAssets.length >= 1000 || !more) {
            const quickYearData = generateYearDataFromAssets(allAssets, new Map());
            setYearData(quickYearData);
            
            // Fortschritt berechnen und aktualisieren
            totalPhotosCount += assets.length;
            const currentProgress = Math.min(85, Math.floor((totalPhotosCount / totalCount) * 85));
            setProgress(currentProgress);
          }
          
          console.log("Batch stats:", {
            batchSize: assets.length,
            batchNumber: batchCount + 1,
            totalLoaded: allAssets.length,
            totalCount,
            firstDate: assets[0]?.creationTime
              ? new Date(assets[0].creationTime).toLocaleDateString()
              : "none",
            lastDate: assets[assets.length - 1]?.creationTime
              ? new Date(assets[assets.length - 1].creationTime).toLocaleDateString()
              : "none",
          });
        }

        batchCount++;
        hasNextPage = more;
        after = assets[assets.length - 1]?.id;

        if (!more) {
          console.log("No more pages available");
          break;
        }
      }

      console.log("Final photo collection:", {
        totalPhotos: allAssets.length,
        oldestPhoto: allAssets[allAssets.length - 1]?.creationTime
          ? new Date(
              allAssets[allAssets.length - 1].creationTime
            ).toLocaleDateString()
          : "none",
        newestPhoto: allAssets[0]?.creationTime
          ? new Date(allAssets[0].creationTime).toLocaleDateString()
          : "none",
      });

      // Fortschritt aktualisieren - jetzt bearbeiten wir die Daten
      setLoadingState('processing-years');
      setProgress(90);

      // Die volle Datenverarbeitung durchführen
      const finalYearData = await processYearData(allAssets);
      
      // Fortschritt abschließen
      setProgress(100);
      setLoadingState('complete');
      
      // Daten im Cache speichern
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(finalYearData));
        await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.log("Cache saving error:", error);
      }
      
      setYearData(finalYearData);
    } catch (error) {
      console.error("Error loading month data:", error);
      // Im Fehlerfall auch den Ladestatus aktualisieren
      setLoadingState('complete');
      setProgress(100);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData();
  }, []);

  return {
    yearData,
    isLoading,
    loadingState,
    progress,
    refreshData: () => loadMonthData(true),
  };
};
