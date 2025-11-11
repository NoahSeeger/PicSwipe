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
    // Nur Debug Logs in Development, sonst nur Errors
    const logLevel = __DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR;
    Purchases.setLogLevel(logLevel);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    console.log(`[RevenueCat] Configured for ${Platform.OS}`);
  } catch (error) {
    console.error('[RevenueCat] Configuration error:', error);
  }
};
