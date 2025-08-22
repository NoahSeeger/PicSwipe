import { useEffect, useState } from "react";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MonthThumbnail = {
  month: string;
  monthIndex: number;
  photoCount: number;
  thumbnailUri?: string;
};

export type MonthLoadingState = 'initial' | 'loading-photos' | 'processing-months' | 'loading-thumbnails' | 'complete';

const MONTH_THUMB_CACHE_KEY = 'month_thumbnails_cache_v2';
const MONTH_CACHE_KEY = 'months_by_year_cache';
const MONTH_CACHE_TIMESTAMP_KEY = 'months_by_year_timestamp_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 Stunde

export function useMonthThumbnails(year: number) {
  const [months, setMonths] = useState<MonthThumbnail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<MonthLoadingState>('initial');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
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
            const parsedData = JSON.parse(cachedData);
            if (isMounted) {
              setMonths(parsedData);
              setLoadingState('complete');
              setProgress(100);
              setIsLoading(false);
              
              // Aktualisiere im Hintergrund
              setTimeout(() => loadMonthDataFromScratch(), 100);
              return;
            }
          }
        }
      } catch (error) {
        console.log("Month cache loading error:", error);
      }
      
      // Wenn kein Cache verfügbar ist, lade von Grund auf
      await loadMonthDataFromScratch();
    }
    
    async function loadMonthDataFromScratch() {
      if (!isMounted) return;
      
      setLoadingState('loading-photos');
      setProgress(10);
      
      let allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;
      let batchCount = 0;
      
      // Verwende kleinere Batches für bessere Performance
      const BATCH_SIZE = 10000;
      
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
        
        // Update progress based on batch count
        setProgress(Math.min(40, 10 + batchCount * 10));
        
        if (!more) break;
      }
      // Update loading state
      setLoadingState('processing-months');
      setProgress(50);
      
      // Filtere nur Fotos aus dem gewünschten Jahr
      const yearAssets = allAssets.filter(asset => {
        const d = new Date(asset.creationTime);
        return d.getFullYear() === year;
      });
      
      // Gruppiere nach Monat
      const monthMap = new Map<number, MediaLibrary.Asset[]>();
      yearAssets.forEach(asset => {
        const d = new Date(asset.creationTime);
        const m = d.getMonth();
        if (!monthMap.has(m)) monthMap.set(m, []);
        monthMap.get(m)!.push(asset);
      });
      
      // Create preliminary month data without thumbnails
      const prelimMonths: MonthThumbnail[] = [];
      for (const [monthIndex, assets] of monthMap.entries()) {
        prelimMonths.push({
          month: new Intl.DateTimeFormat("de-DE", { month: "long" }).format(new Date(year, monthIndex)),
          monthIndex,
          photoCount: assets.length,
        });
      }
      
      // Sortiere nach Monat absteigend
      prelimMonths.sort((a, b) => b.monthIndex - a.monthIndex);
      
      // Update UI with preliminary data but keep isLoading true
      if (isMounted) {
        setMonths(prelimMonths);
        setProgress(60);
        setLoadingState('loading-thumbnails');
        // Don't set isLoading=false yet, we're still loading thumbnails
      }
      // Update loading state
      setLoadingState('loading-thumbnails');
      setProgress(70);
      
      // Lade Cache
      let cached: Record<string, { assetId: string; uri: string }> = {};
      try {
        const cacheRaw = await AsyncStorage.getItem(MONTH_THUMB_CACHE_KEY);
        if (cacheRaw) cached = JSON.parse(cacheRaw);
      } catch {}
      
      // Für jeden Monat: immer das älteste Asset nehmen (erstes nach creationTime), caching
      const newCache: Record<string, { assetId: string; uri: string }> = { ...cached };
      const result: MonthThumbnail[] = [];
      
      let processedMonths = 0;
      const totalMonths = monthMap.size;
      
      for (const [monthIndex, assets] of monthMap.entries()) {
        const monthKey = `${year}-${monthIndex}`;
        let chosenAssetId = '';
        let uri: string | undefined = undefined;
        
        if (cached[monthKey] && assets.some(a => a.id === cached[monthKey].assetId)) {
          chosenAssetId = cached[monthKey].assetId;
          uri = cached[monthKey].uri;
          newCache[monthKey] = cached[monthKey];
        } else if (assets.length > 0) {
          // Assets sind nach creationTime sortiert, also ist das erste das älteste
          chosenAssetId = assets[0].id;
          try {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(chosenAssetId);
            uri = assetInfo.localUri || assetInfo.uri;
            newCache[monthKey] = { assetId: chosenAssetId, uri };
          } catch {}
        }
        
        result.push({
          month: new Intl.DateTimeFormat("de-DE", { month: "long" }).format(new Date(year, monthIndex)),
          monthIndex,
          photoCount: assets.length,
          thumbnailUri: uri,
        });
        
        // Update progress as thumbnails are loaded
        processedMonths++;
        const thumbnailProgress = Math.min(90, 70 + (processedMonths / totalMonths) * 20);
        if (isMounted) {
          setProgress(thumbnailProgress);
          
          // Update UI with partial thumbnail results every few months
          if (processedMonths % 3 === 0 || processedMonths === totalMonths) {
            const partialResults = [...result];
            partialResults.sort((a, b) => b.monthIndex - a.monthIndex);
            setMonths(partialResults);
          }
        }
      }
      
      // Sortiere nach Monat absteigend (wie bisher)
      result.sort((a, b) => b.monthIndex - a.monthIndex);
      
      // Cache speichern
      try {
        await AsyncStorage.setItem(MONTH_THUMB_CACHE_KEY, JSON.stringify(newCache));
        
        // Save complete month data in cache
        const cacheKey = `${MONTH_CACHE_KEY}_${year}`;
        const timestampKey = `${MONTH_CACHE_TIMESTAMP_KEY}_${year}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
        await AsyncStorage.setItem(timestampKey, Date.now().toString());
      } catch (error) {
        console.log("Month cache saving error:", error);
      }
      
      // Finalize
      if (isMounted) {
        setMonths(result);
        setProgress(100);
        setLoadingState('complete');
        setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [year]);

  return { months, isLoading, loadingState, progress };
}
