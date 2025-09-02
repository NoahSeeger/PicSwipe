import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Deutsche Übersetzungen
import deCommon from './locales/de/common.json';
import deCleanup from './locales/de/cleanup.json';
import deHome from './locales/de/home.json';
import deSettings from './locales/de/settings.json';
import deAlbums from './locales/de/albums.json';

// Englische Übersetzungen
import enCommon from './locales/en/common.json';
import enCleanup from './locales/en/cleanup.json';
import enHome from './locales/en/home.json';
import enSettings from './locales/en/settings.json';
import enAlbums from './locales/en/albums.json';

// Sprach-Ressourcen
const resources = {
  de: {
    common: deCommon,
    cleanup: deCleanup,
    home: deHome,
    settings: deSettings,
    albums: deAlbums,
  },
  en: {
    common: enCommon,
    cleanup: enCleanup,
    home: enHome,
    settings: enSettings,
    albums: enAlbums,
  },
};

// Async Storage Language Detector
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // Versuche gespeicherte Sprache aus AsyncStorage zu laden
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }
      
      // Fallback auf Gerätesprache
      const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
      let language = 'en';
      if (deviceLanguage === 'de') {
        language = 'de';
      }
      // Alles andere ist Englisch
      callback(language);
    } catch (error) {
      console.log('Error reading language from AsyncStorage:', error);
  callback('en'); // Fallback auf Englisch
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem('user-language', language);
    } catch (error) {
      console.log('Error saving language to AsyncStorage:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false, // React bereits XSS sicher
    },
    
    // Pluralisierung aktivieren
    pluralSeparator: '_',
    contextSeparator: '_',
    
    // Debugging (nur in Development)
    debug: __DEV__,
    
    // Namespace-Trennung
    nsSeparator: ':',
    keySeparator: '.',
    
    // React spezifische Optionen
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Hilfsfunktionen für einfachere Nutzung
export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
};

export const getCurrentLanguage = () => i18n.language;

export const getSupportedLanguages = () => ['de', 'en'];
