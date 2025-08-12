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

export const useMonthData = () => {
  const [yearData, setYearData] = useState<YearData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMonthData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);

      const { status } = await MediaLibrary.getPermissionsAsync();
      // Support für SDKs ohne "limited": akzeptiere "granted" oder eine evtl. vorhandene "limited"-Konstante
      if (
        status !== "granted" &&
        (status as unknown as PermissionStatus) !==
          ("limited" as unknown as PermissionStatus)
      ) {
        return;
      }

      let allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;

      while (hasNextPage) {
        console.log("Fetching photos batch, after:", after);
        const { assets, hasNextPage: more } = await MediaLibrary.getAssetsAsync(
          {
            mediaType: MediaLibrary.MediaType.photo,
            first: 50000, // Kleinere Batch-Größe
            after,
            sortBy: MediaLibrary.SortBy.creationTime,
          }
        );

        console.log("Batch stats:", {
          batchSize: assets.length,
          firstDate: assets[0]?.creationTime
            ? new Date(assets[0].creationTime).toLocaleDateString()
            : "none",
          lastDate: assets[assets.length - 1]?.creationTime
            ? new Date(
                assets[assets.length - 1].creationTime
              ).toLocaleDateString()
            : "none",
        });

        allAssets = [...allAssets, ...assets];
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

      // Rest der Funktion bleibt gleich...
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
      allAssets.forEach((asset) => {
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

      // Wähle für jedes Jahr ein zufälliges Asset als Thumbnail (cached, wenn möglich)
      const yearThumbnails = new Map<number, string>();
      const newYearCache: Record<string, { assetId: string; uri: string }> = {};
      for (const [year, assetIds] of yearAssetIds.entries()) {
        let chosenAssetId = '';
        if (cachedYearThumbnails[year] && assetIds.includes(cachedYearThumbnails[year].assetId)) {
          chosenAssetId = cachedYearThumbnails[year].assetId;
        } else if (assetIds.length > 0) {
          chosenAssetId = assetIds[Math.floor(Math.random() * assetIds.length)];
        }
        if (chosenAssetId) {
          try {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(chosenAssetId);
            const uri = assetInfo.localUri || assetInfo.uri;
            yearThumbnails.set(year, uri);
            newYearCache[year] = { assetId: chosenAssetId, uri };
          } catch {}
        }
      }
      // Wähle für jeden Monat ein zufälliges Asset als Thumbnail (cached, wenn möglich)
      const monthThumbnails = new Map<string, string>();
        // Cache aktualisieren für Jahr-Thumbnails
        try {
          await AsyncStorage.setItem(YEAR_THUMB_CACHE_KEY, JSON.stringify(newYearCache));
        } catch {}
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

      setYearData(sortedYears);
    } catch (error) {
      console.error("Error loading month data:", error);
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
    refreshData: () => loadMonthData(true),
  };
};
