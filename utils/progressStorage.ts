import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_STORAGE_KEY = 'picswipe_progress';

export interface MonthProgress {
  year: number;
  month: number; // 0-11 (Januar = 0)
  completedAt: string; // ISO date string
  photosProcessed: number;
  photosDeleted: number;
}

export interface AlbumProgress {
  albumId: string;
  albumTitle: string;
  completedAt: string; // ISO date string
  photosProcessed: number;
  photosDeleted: number;
}

export interface ProgressData {
  completedMonths: MonthProgress[];
  completedAlbums: AlbumProgress[];
  lastUpdated: string;
}

class ProgressStorage {
  private cache: ProgressData | null = null;

  async getProgress(): Promise<ProgressData> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const stored = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        return this.cache!;
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }

    // Default empty progress
    const defaultProgress: ProgressData = {
      completedMonths: [],
      completedAlbums: [],
      lastUpdated: new Date().toISOString()
    };
    this.cache = defaultProgress;
    return defaultProgress;
  }

  async markMonthCompleted(
    year: number, 
    month: number, 
    photosProcessed: number, 
    photosDeleted: number
  ): Promise<void> {
    try {
      const progress = await this.getProgress();
      
      // Remove existing entry for this month if it exists
      progress.completedMonths = progress.completedMonths.filter(
        m => !(m.year === year && m.month === month)
      );

      // Add new entry
      progress.completedMonths.push({
        year,
        month,
        completedAt: new Date().toISOString(),
        photosProcessed,
        photosDeleted
      });

      progress.lastUpdated = new Date().toISOString();

      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      this.cache = progress;
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  async markAlbumCompleted(
    albumId: string,
    albumTitle: string,
    photosProcessed: number, 
    photosDeleted: number
  ): Promise<void> {
    try {
      const progress = await this.getProgress();
      
      // Remove existing entry for this album if it exists
      progress.completedAlbums = progress.completedAlbums.filter(
        a => a.albumId !== albumId
      );

      // Add new entry
      progress.completedAlbums.push({
        albumId,
        albumTitle,
        completedAt: new Date().toISOString(),
        photosProcessed,
        photosDeleted
      });

      progress.lastUpdated = new Date().toISOString();

      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      this.cache = progress;
    } catch (error) {
      console.error('Error saving album progress:', error);
    }
  }

  async isMonthCompleted(year: number, month: number): Promise<boolean> {
    const progress = await this.getProgress();
    return progress.completedMonths.some(
      m => m.year === year && m.month === month
    );
  }

  async isAlbumCompleted(albumId: string): Promise<boolean> {
    const progress = await this.getProgress();
    return progress.completedAlbums.some(
      a => a.albumId === albumId
    );
  }

  async getYearProgress(year: number): Promise<boolean[]> {
    const progress = await this.getProgress();
    const yearProgress = new Array(12).fill(false);
    
    progress.completedMonths
      .filter(m => m.year === year)
      .forEach(m => {
        if (m.month >= 0 && m.month < 12) {
          yearProgress[m.month] = true;
        }
      });

    return yearProgress;
  }

  async getCompletedMonthsForYear(year: number): Promise<MonthProgress[]> {
    const progress = await this.getProgress();
    return progress.completedMonths.filter(m => m.year === year);
  }

  async getCompletedAlbums(): Promise<AlbumProgress[]> {
    const progress = await this.getProgress();
    return progress.completedAlbums;
  }

  async getTotalStats(): Promise<{
    totalMonthsCompleted: number;
    totalAlbumsCompleted: number;
    totalPhotosProcessed: number;
    totalPhotosDeleted: number;
  }> {
    const progress = await this.getProgress();
    
    return {
      totalMonthsCompleted: progress.completedMonths.length,
      totalAlbumsCompleted: progress.completedAlbums.length,
      totalPhotosProcessed: 
        progress.completedMonths.reduce((sum, m) => sum + m.photosProcessed, 0) +
        progress.completedAlbums.reduce((sum, a) => sum + a.photosProcessed, 0),
      totalPhotosDeleted: 
        progress.completedMonths.reduce((sum, m) => sum + m.photosDeleted, 0) +
        progress.completedAlbums.reduce((sum, a) => sum + a.photosDeleted, 0)
    };
  }

  async clearProgress(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROGRESS_STORAGE_KEY);
      this.cache = null;
    } catch (error) {
      console.error('Error clearing progress:', error);
    }
  }

  async clearMonthProgress(): Promise<void> {
    try {
      const progress = await this.getProgress();
      progress.completedMonths = [];
      progress.lastUpdated = new Date().toISOString();
      
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      this.cache = progress;
    } catch (error) {
      console.error('Error clearing month progress:', error);
    }
  }

  async clearAlbumProgress(): Promise<void> {
    try {
      const progress = await this.getProgress();
      progress.completedAlbums = [];
      progress.lastUpdated = new Date().toISOString();
      
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      this.cache = progress;
    } catch (error) {
      console.error('Error clearing album progress:', error);
    }
  }

  // Invalidate cache when data might have changed externally
  invalidateCache(): void {
    this.cache = null;
  }
}

export const progressStorage = new ProgressStorage();