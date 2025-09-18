import { useState, useEffect, useCallback } from 'react';
import { progressStorage, MonthProgress, AlbumProgress } from '@/utils/progressStorage';

export function useProgress() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Trigger a refresh of progress data
  const refreshProgress = useCallback(() => {
    progressStorage.invalidateCache();
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Mark a month as completed
  const markMonthCompleted = useCallback(async (
    year: number,
    month: number,
    photosProcessed: number,
    photosDeleted: number
  ): Promise<void> => {
    await progressStorage.markMonthCompleted(year, month, photosProcessed, photosDeleted);
    refreshProgress();
  }, [refreshProgress]);

  // Mark an album as completed
  const markAlbumCompleted = useCallback(async (
    albumId: string,
    albumTitle: string,
    photosProcessed: number,
    photosDeleted: number
  ): Promise<void> => {
    await progressStorage.markAlbumCompleted(albumId, albumTitle, photosProcessed, photosDeleted);
    refreshProgress();
  }, [refreshProgress]);

  // Check if a specific month is completed
  const isMonthCompleted = useCallback(async (year: number, month: number): Promise<boolean> => {
    return await progressStorage.isMonthCompleted(year, month);
  }, []);

  // Check if a specific album is completed
  const isAlbumCompleted = useCallback(async (albumId: string): Promise<boolean> => {
    return await progressStorage.isAlbumCompleted(albumId);
  }, []);

  // Get progress for a specific year (12 booleans for each month)
  const getYearProgress = useCallback(async (year: number): Promise<boolean[]> => {
    return await progressStorage.getYearProgress(year);
  }, []);

  // Get detailed progress for a specific year
  const getCompletedMonthsForYear = useCallback(async (year: number): Promise<MonthProgress[]> => {
    return await progressStorage.getCompletedMonthsForYear(year);
  }, []);

  // Get all completed albums
  const getCompletedAlbums = useCallback(async (): Promise<AlbumProgress[]> => {
    return await progressStorage.getCompletedAlbums();
  }, []);

  // Get total statistics
  const getTotalStats = useCallback(async () => {
    return await progressStorage.getTotalStats();
  }, []);

  // Clear all progress (for settings/debugging)
  const clearProgress = useCallback(async (): Promise<void> => {
    await progressStorage.clearProgress();
    refreshProgress();
  }, [refreshProgress]);

  // Clear only month progress
  const clearMonthProgress = useCallback(async (): Promise<void> => {
    await progressStorage.clearMonthProgress();
    refreshProgress();
  }, [refreshProgress]);

  // Clear only album progress
  const clearAlbumProgress = useCallback(async (): Promise<void> => {
    await progressStorage.clearAlbumProgress();
    refreshProgress();
  }, [refreshProgress]);

  useEffect(() => {
    setIsLoading(false);
  }, [refreshTrigger]);

  return {
    isLoading,
    markMonthCompleted,
    markAlbumCompleted,
    isMonthCompleted,
    isAlbumCompleted,
    getYearProgress,
    getCompletedMonthsForYear,
    getCompletedAlbums,
    getTotalStats,
    clearProgress,
    clearMonthProgress,
    clearAlbumProgress,
    refreshProgress,
  };
}