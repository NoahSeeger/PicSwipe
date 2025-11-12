import { useTranslation } from 'react-i18next';

export type NamespaceType = 'common' | 'cleanup' | 'home' | 'onboarding' | 'settings' | 'albums';

/**
 * Hook für typisierte Übersetzungen
 * Beispiel: const { t } = useI18n('cleanup');
 *          t('monthComplete.title') // "Monat durchgearbeitet!"
 */
export const useI18n = (namespace: NamespaceType = 'common') => {
  const { t, i18n } = useTranslation(namespace);
  
  return {
    t,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
    isReady: i18n.isInitialized,
  };
};

/**
 * Hook für mehrere Namespaces gleichzeitig
 * Beispiel: const { t } = useMultipleI18n(['common', 'cleanup']);
 *          t('common:buttons.continue') // "Weiter"
 *          t('cleanup:monthComplete.title') // "Monat durchgearbeitet!"
 */
export const useMultipleI18n = (namespaces: NamespaceType[]) => {
  const { t, i18n } = useTranslation(namespaces);
  
  return {
    t,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
    isReady: i18n.isInitialized,
  };
};

/**
 * Hook für häufig verwendete common Übersetzungen
 */
export const useCommonI18n = () => {
  const { t } = useI18n('common');
  
  return {
    t,
    // Häufig verwendete Übersetzungen als separate Funktionen
    buttons: {
      continue: () => t('buttons.continue'),
      cancel: () => t('buttons.cancel'),
      delete: () => t('buttons.delete'),
      save: () => t('buttons.save'),
      close: () => t('buttons.close'),
    },
    common: {
      loading: () => t('common.loading'),
      error: () => t('common.error'),
      success: () => t('common.success'),
      photos: (count: number) => t('common.photos', { count }),
      photo: () => t('common.photo'),
    },
  };
};

/**
 * Formatiert Zahlen entsprechend der aktuellen Sprache
 */
export const useNumberFormat = () => {
  const { language } = useI18n();
  
  const formatNumber = (number: number) => {
    return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US').format(number);
  };
  
  const formatBytes = (bytes: number) => {
    const units = language === 'de' 
      ? ['Bytes', 'KB', 'MB', 'GB', 'TB'] 
      : ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    // ✅ Nutzerfreundliche Rundung: Keine Dezimalstellen für große Zahlen
    let roundedSize: number;
    if (size >= 100) {
      // > 100 KB/MB/GB: Keine Dezimalstellen (z.B. "156 MB")
      roundedSize = Math.round(size);
    } else if (size >= 10) {
      // 10-100 KB/MB/GB: Ganze Zahlen (z.B. "45 MB")
      roundedSize = Math.round(size);
    } else {
      // < 10 KB/MB/GB: 1 Dezimalstelle (z.B. "4.5 MB")
      roundedSize = Math.round(size * 10) / 10;
    }
    
    return `${formatNumber(roundedSize)} ${units[unitIndex]}`;
  };
  
  return {
    formatNumber,
    formatBytes,
  };
};

/**
 * Hook für Datum-Formatierung basierend auf der aktuellen Sprache
 */
export const useDateFormat = () => {
  const { language } = useI18n();
  
  const getMonthName = (monthIndex: number) => {
    const date = new Date(2000, monthIndex, 1);
    return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', { 
      month: 'long' 
    }).format(date);
  };
  
  const getShortMonthName = (monthIndex: number) => {
    const date = new Date(2000, monthIndex, 1);
    return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', { 
      month: 'short' 
    }).format(date);
  };
  
  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', options).format(date);
  };
  
  return {
    getMonthName,
    getShortMonthName, 
    formatDate,
  };
};
