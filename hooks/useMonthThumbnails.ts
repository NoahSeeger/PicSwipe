import { useEffect, useState } from "react";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MonthThumbnail = {
  month: string;
  monthIndex: number;
  photoCount: number;
  thumbnailUri?: string;
};

const MONTH_THUMB_CACHE_KEY = 'month_thumbnails_cache_v2';

export function useMonthThumbnails(year: number) {
  const [months, setMonths] = useState<MonthThumbnail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      let allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;
      while (hasNextPage) {
        const { assets, hasNextPage: more } = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          first: 50000,
          after,
          sortBy: MediaLibrary.SortBy.creationTime,
        });
        allAssets = [...allAssets, ...assets];
        hasNextPage = more;
        after = assets[assets.length - 1]?.id;
        if (!more) break;
      }
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
      // Lade Cache
      let cached: Record<string, { assetId: string; uri: string }> = {};
      try {
        const cacheRaw = await AsyncStorage.getItem(MONTH_THUMB_CACHE_KEY);
        if (cacheRaw) cached = JSON.parse(cacheRaw);
      } catch {}
      // Für jeden Monat: immer das älteste Asset nehmen (erstes nach creationTime), caching
      const newCache: Record<string, { assetId: string; uri: string }> = { ...cached };
      const result: MonthThumbnail[] = [];
      for (const [monthIndex, assets] of monthMap.entries()) {
        const monthKey = `${year}-${monthIndex}`;
        let chosenAssetId = '';
        if (cached[monthKey] && assets.some(a => a.id === cached[monthKey].assetId)) {
          chosenAssetId = cached[monthKey].assetId;
        } else if (assets.length > 0) {
          // Assets sind nach creationTime sortiert, also ist das erste das älteste
          chosenAssetId = assets[0].id;
        }
        let uri: string | undefined = undefined;
        if (chosenAssetId) {
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
      }
      // Sortiere nach Monat absteigend (wie bisher)
      result.sort((a, b) => b.monthIndex - a.monthIndex);
      // Cache speichern
      try {
        await AsyncStorage.setItem(MONTH_THUMB_CACHE_KEY, JSON.stringify(newCache));
      } catch {}
      if (isMounted) {
        setMonths(result);
        setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [year]);

  return { months, isLoading };
}
