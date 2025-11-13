import { useEffect, useState, useCallback, useRef } from "react";
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
const YEAR_CACHE_KEY = 'years_overview_cache_v2';
const YEAR_CACHE_TIMESTAMP_KEY = 'years_overview_timestamp_cache_v2';
const CACHE_DURATION = 1000 * 60 * 60; // 1 Stunde

export function useYearThumbnails() {
  const [years, setYears] = useState<YearThumbnail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<YearLoadingState>('initial');
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
        const timestampStr = await AsyncStorage.getItem(YEAR_CACHE_TIMESTAMP_KEY);
        const cachedData = await AsyncStorage.getItem(YEAR_CACHE_KEY);
        
        if (timestampStr && cachedData) {
          const timestamp = parseInt(timestampStr);
          const now = Date.now();
          
          // Wenn der Cache frisch genug ist, nutze ihn
          if (now - timestamp < CACHE_DURATION) {
            const parsedData = JSON.parse(cachedData) as YearThumbnail[];
            if (isMountedRef.current) {
              setYears(parsedData);
              setLoadingState('complete');
              setProgress(100);
              setIsLoading(false);
            }
            return; // ✅ KEIN Hintergrund-Reload mehr!
          }
        }
      } catch (error) {
        console.log("Year cache loading error:", error);
      }
      
      // Wenn kein Cache verfügbar ist, lade von Grund auf
      await loadYearDataFromScratch();
    }
    
    async function loadYearDataFromScratch() {
      if (!isMountedRef.current) return;
      
      try {
        setLoadingState('loading-photos');
        setProgress(10);
        
        let allAssets: MediaLibrary.Asset[] = [];
        let hasNextPage = true;
        let after: string | undefined = undefined;
        
        // Optimierte Batch-Größe für bessere Performance
        const BATCH_SIZE = 5000;
        
        // ✅ KEINE separate totalCount Query mehr!
        
        while (hasNextPage) {
          if (!isMountedRef.current) return; // Safety check in loop
          
          const { assets, hasNextPage: more } = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.photo,
            first: BATCH_SIZE,
            after,
            sortBy: MediaLibrary.SortBy.creationTime,
          });
          
          // ✅ push() statt spread - viel schneller bei großen Arrays!
          allAssets.push(...assets);
          hasNextPage = more;
          after = assets[assets.length - 1]?.id;
          
          // Update progress basierend auf geladenen Assets
          const loadProgress = Math.min(60, 10 + (allAssets.length / 1000) * 50);
          if (isMountedRef.current) {
            setProgress(loadProgress);
          }
          
          // ✅ Zeige Zwischenergebnisse nur alle 3000 Fotos (Memory-optimiert)
          if ((allAssets.length % 3000 === 0 && allAssets.length >= 3000) || !more) {
            const prelimYears = buildYearStructure(allAssets);
            if (isMountedRef.current) {
              setYears(prelimYears);
            }
          }
          
          if (!more) break;
        }
        
        // ✅ buildYearStructure wird NICHT mehr aufgerufen - verwende letztes Ergebnis aus Loop!
        setLoadingState('processing-years');
        setProgress(70);
        
        // Da wir im Loop schon die Struktur gebaut haben, verwenden wir das finale Array direkt
        const yearStructure = buildYearStructure(allAssets);
        
        if (!isMountedRef.current) return;
        
        setYears(yearStructure);
        
        // Lade Thumbnails für jedes Jahr - PARALLEL!
        setLoadingState('loading-thumbnails');
        
        // Lade Thumbnail-Cache
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
        
        if (!isMountedRef.current) return;
        
        // Baue neuen Cache
        const newCache: Record<string, { assetId: string; uri: string }> = {};
        yearsWithThumbnails.forEach(year => {
          if (year.cacheEntry) {
            newCache[year.year] = year.cacheEntry;
          }
        });
        
        // Entferne cacheEntry aus dem finalen Objekt
        const finalYears = yearsWithThumbnails.map(({ cacheEntry, ...year }) => year);
        
        if (isMountedRef.current) {
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
        if (isMountedRef.current) {
          setYears(finalYears);
          setProgress(100);
          setLoadingState('complete');
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading year data:", error);
        if (isMountedRef.current) {
          setLoadingState('complete');
          setIsLoading(false);
        }
      }
    }
    
    load();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      // 🧹 Cleanup: Assets freigeben wenn Component unmounted
      // Die thumbnailUri Strings bleiben im Cache, aber die Asset-Objekte werden freigegeben
      setYears([]);
    };
  }, [refreshTrigger]);

  // ✅ useCallback verhindert unnötige Re-Renders
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

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
