import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// RevenueCat API Keys - beide Plattformen verwenden momentan den gleichen Key
const REVENUECAT_API_KEY = "appl_AfqyHTRArOyTHiRDAvgWKmWqTWM";

/**
 * Konfiguriert RevenueCat einmalig beim App-Start
 * Muss vor allen React-Komponenten aufgerufen werden
 */
export const configureRevenueCat = (): void => {
  try {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    console.log(`[RevenueCat] Konfiguriert für ${Platform.OS} mit Key: ${REVENUECAT_API_KEY.substring(0, 10)}...`);
  } catch (error) {
    console.error('[RevenueCat] Konfigurationsfehler:', error);
  }
};
