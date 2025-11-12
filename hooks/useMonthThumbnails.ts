import { useEffect, useState, useCallback, useRef } from "react";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MonthThumbnail = {
  month: string;
  monthIndex: number;
  photoCount: number;
  thumbnailUri?: string;
};

export type MonthLoadingState = 'initial' | 'loading-photos' | 'processing-months' | 'loading-thumbnails' | 'complete';

const MONTH_THUMB_CACHE_KEY = 'month_thumbnails_cache_v3';
const MONTH_CACHE_KEY = 'months_by_year_cache_v2';
const MONTH_CACHE_TIMESTAMP_KEY = 'months_by_year_timestamp_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 Stunde

export function useMonthThumbnails(year: number) {
  const [months, setMonths] = useState<MonthThumbnail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<MonthLoadingState>('initial');
  const [progress, setProgress] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // useRef um Memory Leaks zu verhindern
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    async function load() {
      setIsLoading(true);
      setLoadingState('initial');
      setProgress(0);
      
      // Versuche zuerst aus dem Cache zu laden
      try {
        const cacheKey = `${MONTH_CACHE_KEY}_${year}`;
        const timestampKey = `${MONTH_CACHE_TIMESTAMP_KEY}_${year}`;
        const timestampStr = await AsyncStorage.getItem(timestampKey);
        const cachedData = await AsyncStorage.getItem(cacheKey);
        
        if (timestampStr && cachedData) {
          const timestamp = parseInt(timestampStr);
          const now = Date.now();
          
          // Wenn der Cache frisch genug ist, nutze ihn
          if (now - timestamp < CACHE_DURATION) {
            const parsedData = JSON.parse(cachedData) as MonthThumbnail[];
            if (isMountedRef.current) {
              setMonths(parsedData);
              setLoadingState('complete');
              setProgress(100);
              setIsLoading(false);
            }
            return; // ✅ KEIN Hintergrund-Reload mehr!
          }
        }
      } catch (error) {
        console.log("Month cache loading error:", error);
      }
      
      // Wenn kein Cache verfügbar ist, lade von Grund auf
      await loadMonthDataFromScratch();
    }
    
    async function loadMonthDataFromScratch() {
      if (!isMountedRef.current) return;
      
      try {
        setLoadingState('loading-photos');
        setProgress(10);
        
        // 1. Lade NUR Assets des gewünschten Jahres (optimiert mit Date-Filter)
        const startOfYear = new Date(year, 0, 1).getTime();
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
        
        let allAssets: MediaLibrary.Asset[] = [];
        let hasNextPage = true;
        let after: string | undefined = undefined;
        
        const BATCH_SIZE = 5000; // Kleinere Batches für ein einzelnes Jahr
        
        while (hasNextPage) {
          if (!isMountedRef.current) return; // Safety check in loop
          
          const { assets, hasNextPage: more } = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.photo,
            first: BATCH_SIZE,
            after,
            sortBy: MediaLibrary.SortBy.creationTime,
            createdAfter: startOfYear,
            createdBefore: endOfYear,
          });
          
          // ✅ push() statt spread - viel schneller bei großen Arrays!
          allAssets.push(...assets);
          hasNextPage = more;
          after = assets[assets.length - 1]?.id;
          
          // Update progress während des Ladens
          const loadProgress = Math.min(60, 10 + (allAssets.length / 500) * 50);
          if (isMountedRef.current) {
            setProgress(loadProgress);
          }
          
          if (!more) break;
        }
      
      // 2. Gruppiere Assets nach Monat
      setLoadingState('processing-months');
      setProgress(60);
      
      const monthStructure = buildMonthStructure(allAssets, year);
      
      if (isMountedRef.current) {
        setMonths(monthStructure);
        setProgress(70);
      }
      
      // 3. Lade Thumbnails - PARALLEL!
      setLoadingState('loading-thumbnails');
      setProgress(70);
      
      // Lade Cache
      let cachedThumbnails: Record<string, { assetId: string; uri: string }> = {};
      try {
        const cacheRaw = await AsyncStorage.getItem(MONTH_THUMB_CACHE_KEY);
        if (cacheRaw) cachedThumbnails = JSON.parse(cacheRaw);
      } catch {}
      
      // Erstelle eine Map von Monat zu neuestem Asset für O(1) Zugriff
      const monthToNewestAsset = new Map<number, MediaLibrary.Asset>();
      allAssets.forEach(asset => {
        const monthIndex = new Date(asset.creationTime).getMonth(); // 0-11
        const existing = monthToNewestAsset.get(monthIndex);
        // Nehme das neueste Asset des Monats (höchste creationTime)
        if (!existing || asset.creationTime > existing.creationTime) {
          monthToNewestAsset.set(monthIndex, asset);
        }
      });
      
      // Lade alle Thumbnails PARALLEL mit Promise.all
      const thumbnailPromises = monthStructure.map(async (monthData) => {
        const { monthIndex } = monthData;
        const cacheKey = `${year}-${monthIndex}`;
        let thumbnailUri: string | undefined = undefined;
        let chosenAssetId = '';
        
        // 1. Prüfe Cache - validiere dass das Asset noch existiert
        if (cachedThumbnails[cacheKey]) {
          const cachedAsset = allAssets.find(asset => asset.id === cachedThumbnails[cacheKey].assetId);
          if (cachedAsset) {
            thumbnailUri = cachedThumbnails[cacheKey].uri;
            chosenAssetId = cachedThumbnails[cacheKey].assetId;
          }
        }
        
        // 2. Wenn nicht im Cache: Nehme das neueste Asset des Monats
        if (!thumbnailUri) {
          const newestAsset = monthToNewestAsset.get(monthIndex);
          if (newestAsset) {
            // Verwende direkt die URI aus dem Asset - KEIN zusätzlicher getAssetInfoAsync Call!
            thumbnailUri = newestAsset.uri;
            chosenAssetId = newestAsset.id;
          }
        }
        
        return {
          ...monthData,
          thumbnailUri,
          cacheEntry: thumbnailUri ? { assetId: chosenAssetId, uri: thumbnailUri } : null,
        };
      });
      
      // Warte auf alle Thumbnails parallel
      const monthsWithThumbnails = await Promise.all(thumbnailPromises);
      
      // Baue neuen Cache
      const newCache: Record<string, { assetId: string; uri: string }> = {};
      monthsWithThumbnails.forEach(m => {
        if (m.cacheEntry) {
          newCache[`${year}-${m.monthIndex}`] = m.cacheEntry;
        }
      });
      
      // Entferne cacheEntry aus dem finalen Objekt
      const finalMonths = monthsWithThumbnails.map(({ cacheEntry, ...month }) => month);
      
      if (isMountedRef.current) {
        setMonths(finalMonths);
        setProgress(90);
      }
      
      // Cache speichern
      try {
        await AsyncStorage.setItem(MONTH_THUMB_CACHE_KEY, JSON.stringify(newCache));
        
        // Save complete month data in cache
        const cacheKey = `${MONTH_CACHE_KEY}_${year}`;
        const timestampKey = `${MONTH_CACHE_TIMESTAMP_KEY}_${year}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(finalMonths));
        await AsyncStorage.setItem(timestampKey, Date.now().toString());
      } catch (error) {
        console.log("Month cache saving error:", error);
      }
      
        
        // Finalize
        if (isMountedRef.current) {
          setMonths(finalMonths);
          setProgress(100);
          setLoadingState('complete');
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading month data:", error);
        if (isMountedRef.current) {
          setLoadingState('complete');
          setIsLoading(false);
        }
      }
    }
    
    load();
    return () => { isMountedRef.current = false; };
  }, [year, refreshTrigger]);  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return { months, isLoading, loadingState, progress, refreshData };
}

/**
 * Baut die Monats-Struktur aus Assets auf (ohne Thumbnails)
 */
function buildMonthStructure(assets: MediaLibrary.Asset[], year: number): MonthThumbnail[] {
  const monthMap = new Map<number, number>(); // monthIndex -> photoCount
  
  assets.forEach(asset => {
    const date = new Date(asset.creationTime);
    if (isNaN(date.getTime())) return;
    
    const monthIndex = date.getMonth(); // 0-11
    monthMap.set(monthIndex, (monthMap.get(monthIndex) || 0) + 1);
  });
  
  // Konvertiere zu Array und sortiere nach Monat absteigend (Dezember bis Januar)
  const months: MonthThumbnail[] = Array.from(monthMap.entries())
    .map(([monthIndex, photoCount]) => ({
      month: new Intl.DateTimeFormat("de-DE", { month: "long" }).format(new Date(year, monthIndex)),
      monthIndex,
      photoCount,
    }))
    .sort((a, b) => b.monthIndex - a.monthIndex);
  
  return months;
}
