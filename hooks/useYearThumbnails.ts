import { useEffect, useState } from "react";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type YearThumbnail = {
  year: number;
  months: Array<{ month: number }>;
  totalPhotos: number;
  thumbnailUri?: string;
};

export type YearLoadingState = 'initial' | 'loading-photos' | 'processing-years' | 'loading-thumbnails' | 'complete';

const YEAR_THUMB_CACHE_KEY = 'year_thumbnails_cache_v3';
const YEAR_CACHE_KEY = 'years_overview_cache';
const YEAR_CACHE_TIMESTAMP_KEY = 'years_overview_timestamp_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 Stunde

export function useYearThumbnails() {
  const [years, setYears] = useState<YearThumbnail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<YearLoadingState>('initial');
  const [progress, setProgress] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    async function load() {
      setIsLoading(true);
      setLoadingState('initial');
      setProgress(0);
      
      // Versuche zuerst aus dem Cache zu laden
      try {
        const timestampStr = await AsyncStorage.getItem(YEAR_CACHE_TIMESTAMP_KEY);
        const cachedData = await AsyncStorage.getItem(YEAR_CACHE_KEY);
        
        if (timestampStr && cachedData) {
          const timestamp = parseInt(timestampStr);
          const now = Date.now();
          
          // Wenn der Cache frisch genug ist, nutze ihn
          if (now - timestamp < CACHE_DURATION) {
            const parsedData = JSON.parse(cachedData);
            if (isMounted) {
              setYears(parsedData);
              setLoadingState('complete');
              setProgress(100);
              setIsLoading(false);
              
              // Aktualisiere im Hintergrund
              setTimeout(() => loadYearDataFromScratch(), 100);
              return;
            }
          }
        }
      } catch (error) {
        console.log("Year cache loading error:", error);
      }
      
      // Wenn kein Cache verfügbar ist, lade von Grund auf
      await loadYearDataFromScratch();
    }
    
    async function loadYearDataFromScratch() {
      if (!isMounted) return;
      
      setLoadingState('loading-photos');
      setProgress(10);
      
      let allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;
      let batchCount = 0;
      
      // Verwende kleinere Batches für bessere Performance
      const BATCH_SIZE = 10000;
      
      // Hole die Gesamtanzahl für Progress-Berechnung
      const { totalCount } = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 1,
      });
      
      while (hasNextPage) {
        const { assets, hasNextPage: more } = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          first: BATCH_SIZE,
          after,
          sortBy: MediaLibrary.SortBy.creationTime,
        });
        
        allAssets = [...allAssets, ...assets];
        batchCount++;
        hasNextPage = more;
        after = assets[assets.length - 1]?.id;
        
        // Update progress während des Ladens
        const loadProgress = Math.min(50, 10 + (allAssets.length / totalCount) * 40);
        if (isMounted) {
          setProgress(loadProgress);
        }
        
        // Zeige bereits Zwischenergebnisse nach jedem Batch
        if (allAssets.length >= 1000 || !more) {
          const prelimYears = buildYearStructure(allAssets);
          if (isMounted) {
            setYears(prelimYears);
          }
        }
        
        if (!more) break;
      }
      
      // Gruppiere Assets nach Jahr
      setLoadingState('processing-years');
      setProgress(60);
      
      const yearStructure = buildYearStructure(allAssets);
      
      if (isMounted) {
        setYears(yearStructure);
        setProgress(70);
      }
      
      // Lade Thumbnails für jedes Jahr - PARALLEL!
      setLoadingState('loading-thumbnails');
      setProgress(70);
      
      // Lade Cache
      let cachedThumbnails: Record<string, { assetId: string; uri: string }> = {};
      try {
        const cacheRaw = await AsyncStorage.getItem(YEAR_THUMB_CACHE_KEY);
        if (cacheRaw) cachedThumbnails = JSON.parse(cacheRaw);
      } catch {}
      
      // Erstelle eine Map von Jahr zu neuestem Asset für schnellen Zugriff
      const yearToNewestAsset = new Map<number, MediaLibrary.Asset>();
      allAssets.forEach(asset => {
        const year = new Date(asset.creationTime).getFullYear();
        const existing = yearToNewestAsset.get(year);
        if (!existing || asset.creationTime > existing.creationTime) {
          yearToNewestAsset.set(year, asset);
        }
      });
      
      // Lade alle Thumbnails PARALLEL mit Promise.all
      const thumbnailPromises = yearStructure.map(async (yearData) => {
        const { year } = yearData;
        let thumbnailUri: string | undefined = undefined;
        let chosenAssetId = '';
        
        // 1. Prüfe Cache - validiere dass das Asset noch existiert
        if (cachedThumbnails[year]) {
          const cachedAsset = allAssets.find(asset => asset.id === cachedThumbnails[year].assetId);
          if (cachedAsset) {
            thumbnailUri = cachedThumbnails[year].uri;
            chosenAssetId = cachedThumbnails[year].assetId;
          }
        }
        
        // 2. Wenn nicht im Cache: Nehme das neueste Asset des Jahres
        if (!thumbnailUri) {
          const newestAsset = yearToNewestAsset.get(year);
          if (newestAsset) {
            // Verwende direkt die URI aus dem Asset - KEIN zusätzlicher getAssetInfoAsync Call!
            thumbnailUri = newestAsset.uri;
            chosenAssetId = newestAsset.id;
          }
        }
        
        return {
          ...yearData,
          thumbnailUri,
          cacheEntry: thumbnailUri ? { assetId: chosenAssetId, uri: thumbnailUri } : null,
        };
      });
      
      // Warte auf alle Thumbnails parallel
      const yearsWithThumbnails = await Promise.all(thumbnailPromises);
      
      // Baue neuen Cache
      const newCache: Record<string, { assetId: string; uri: string }> = {};
      yearsWithThumbnails.forEach(year => {
        if (year.cacheEntry) {
          newCache[year.year] = year.cacheEntry;
        }
      });
      
      // Entferne cacheEntry aus dem finalen Objekt
      const finalYears = yearsWithThumbnails.map(({ cacheEntry, ...year }) => year);
      
      if (isMounted) {
        setYears(finalYears);
        setProgress(90);
      }
      
      // Cache speichern
      try {
        await AsyncStorage.setItem(YEAR_THUMB_CACHE_KEY, JSON.stringify(newCache));
        await AsyncStorage.setItem(YEAR_CACHE_KEY, JSON.stringify(finalYears));
        await AsyncStorage.setItem(YEAR_CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.log("Year cache saving error:", error);
      }
      
      // Finalize
      if (isMounted) {
        setYears(finalYears);
        setProgress(100);
        setLoadingState('complete');
        setIsLoading(false);
      }
    }
    
    load();
    return () => { isMounted = false; };
  }, [refreshTrigger]);

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { years, isLoading, loadingState, progress, refreshData };
}

/**
 * Baut die Jahr-Struktur aus Assets auf (ohne Thumbnails)
 */
function buildYearStructure(assets: MediaLibrary.Asset[]): YearThumbnail[] {
  const yearMap = new Map<number, { months: Set<number>; photoCount: number }>();
  
  assets.forEach(asset => {
    const date = new Date(asset.creationTime);
    if (isNaN(date.getTime())) return;
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (!yearMap.has(year)) {
      yearMap.set(year, { months: new Set(), photoCount: 0 });
    }
    
    const yearData = yearMap.get(year)!;
    yearData.months.add(month);
    yearData.photoCount++;
  });
  
  // Konvertiere zu Array und sortiere nach Jahr absteigend
  const years: YearThumbnail[] = Array.from(yearMap.entries())
    .map(([year, data]) => ({
      year,
      months: Array.from(data.months).sort((a, b) => b - a).map(m => ({ month: m + 1 })),
      totalPhotos: data.photoCount,
    }))
    .sort((a, b) => b.year - a.year);
  
  return years;
}
