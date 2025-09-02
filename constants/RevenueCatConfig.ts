// constants/RevenueCatConfig.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Bestimme ob wir in Production sind basierend auf __DEV__ und anderen Faktoren
const isProduction = !__DEV__;

// RevenueCat API Keys für verschiedene Umgebungen
const REVENUECAT_CONFIG = {
  ios: {
    development: "appl_AfqyHTRArOyTHiRDAvgWKmWqTWM", // Dein aktueller iOS Key
    production: "appl_AfqyHTRArOyTHiRDAvgWKmWqTWM"   // Sollte der gleiche sein für iOS
  },
  android: {
    development: "goog_YourDevelopmentAndroidKey",    // Ersetze mit deinem echten Android Development Key
    production: "goog_YourProductionAndroidKey"       // Ersetze mit deinem echten Android Production Key
  }
};

export const getRevenueCatApiKey = (): string => {
  const environment = isProduction ? 'production' : 'development';
  
  if (Platform.OS === 'ios') {
    return REVENUECAT_CONFIG.ios[environment];
  } else {
    return REVENUECAT_CONFIG.android[environment];
  }
};

export const isProductionBuild = (): boolean => {
  return isProduction;
};

// Diese Funktion hilft bei der Debugging von Receipt Validation Problemen
export const getReceiptValidationInfo = () => {
  return {
    platform: Platform.OS,
    isProduction: isProduction,
    isDev: __DEV__,
    appOwnership: Constants.appOwnership,
    apiKey: getRevenueCatApiKey()
  };
};
