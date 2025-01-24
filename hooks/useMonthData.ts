import { useState, useEffect } from "react";
import * as MediaLibrary from "expo-media-library";
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

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") return;

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

      allAssets.forEach((asset) => {
        const date = new Date(asset.creationTime);
        // Prüfe auf ungültige Daten
        if (isNaN(date.getTime())) {
          console.warn("Invalid date for asset:", {
            id: asset.id,
            creationTime: asset.creationTime,
            filename: asset.filename,
          });
          return;
        }

        const year = date.getFullYear();
        // Log sehr alte oder sehr neue Fotos
        if (year < 2020 || year > 2025) {
          console.log("Photo outside expected range:", {
            id: asset.id,
            date: date.toLocaleDateString(),
            year,
            filename: asset.filename,
          });
        }

        const month = date.getMonth();

        if (!yearMap.has(year)) {
          yearMap.set(year, { months: new Map() });
        }
        const yearData = yearMap.get(year)!;

        if (!yearData.months.has(month)) {
          yearData.months.set(month, { count: 0 });
        }
        yearData.months.get(month)!.count++;
      });

      // Sortiere Jahre und Monate
      const sortedYears = Array.from(yearMap.entries())
        .sort(([yearA], [yearB]) => yearB - yearA)
        .map(([year, data]) => {
          const months = Array.from(data.months.entries())
            .sort(([monthA], [monthB]) => monthB - monthA)
            .map(([monthIndex, monthData]) => ({
              month: new Intl.DateTimeFormat("de-DE", {
                month: "long",
              }).format(new Date(year, monthIndex)),
              monthIndex,
              photoCount: monthData.count,
              isProcessed: false,
            }));

          return {
            year,
            months,
            totalPhotos: months.reduce(
              (sum, month) => sum + month.photoCount,
              0
            ),
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
