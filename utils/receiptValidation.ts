// utils/receiptValidation.ts
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

/**
 * Verbesserte Receipt Validation die das Sandbox/Production Problem behandelt
 * 
 * Das Problem laut Apple Connect:
 * "When validating receipts on your server, your server needs to be able to handle 
 * a production-signed app getting its receipts from Apple's test environment."
 * 
 * RevenueCat behandelt dies normalerweise automatisch, aber wir können zusätzliche
 * Fehlerbehandlung hinzufügen.
 */

export interface ReceiptValidationResult {
  success: boolean;
  error?: string;
  customerInfo?: any;
  wasFromSandbox?: boolean;
}

/**
 * Robuste CustomerInfo Abfrage mit Sandbox/Production Fallback
 */
export const getCustomerInfoWithFallback = async (): Promise<ReceiptValidationResult> => {
  try {
    console.log('[ReceiptValidation] Lade CustomerInfo...');
    
    const customerInfo = await Purchases.getCustomerInfo();
    
    console.log('[ReceiptValidation] CustomerInfo erfolgreich geladen:', {
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
      platform: Platform.OS,
      originalAppUserId: customerInfo.originalAppUserId
    });
    
    return {
      success: true,
      customerInfo
    };
    
  } catch (error: any) {
    console.error('[ReceiptValidation] Fehler beim Laden der CustomerInfo:', error);
    
    // Prüfe ob es sich um einen Sandbox/Production Validierungsfehler handelt
    const errorMessage = error?.message || error?.toString() || '';
    const isSandboxError = errorMessage.includes('sandbox') || 
                          errorMessage.includes('test environment') ||
                          errorMessage.includes('21007'); // App Store Code für "Sandbox receipt used in production"
    
    if (isSandboxError) {
      console.log('[ReceiptValidation] Sandbox/Production Fehler erkannt, versuche erneut...');
      
      // Warte kurz und versuche es erneut
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('[ReceiptValidation] Zweiter Versuch erfolgreich');
        
        return {
          success: true,
          customerInfo,
          wasFromSandbox: true
        };
      } catch (retryError) {
        console.error('[ReceiptValidation] Auch zweiter Versuch fehlgeschlagen:', retryError);
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Verbesserte Restore Purchases Funktion
 */
export const restorePurchasesWithFallback = async (): Promise<ReceiptValidationResult> => {
  try {
    console.log('[ReceiptValidation] Stelle Käufe wieder her...');
    
    const customerInfo = await Purchases.restorePurchases();
    
    console.log('[ReceiptValidation] Käufe erfolgreich wiederhergestellt:', {
      activeEntitlements: Object.keys(customerInfo.entitlements.active)
    });
    
    return {
      success: true,
      customerInfo
    };
    
  } catch (error: any) {
    console.error('[ReceiptValidation] Fehler beim Wiederherstellen:', error);
    
    const errorMessage = error?.message || error?.toString() || '';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Debugging-Funktion für Receipt Validation Probleme
 */
export const debugReceiptValidation = async () => {
  console.log('[ReceiptValidation] Starte Debugging...');
  
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    const debugInfo = {
      platform: Platform.OS,
      originalAppUserId: customerInfo.originalAppUserId,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
      allEntitlements: Object.keys(customerInfo.entitlements.all),
      requestDate: customerInfo.requestDate,
      firstSeen: customerInfo.firstSeen,
      originalPurchaseDate: customerInfo.originalPurchaseDate,
      latestExpirationDate: customerInfo.latestExpirationDate
    };
    
    console.log('[ReceiptValidation] Debug Info:', debugInfo);
    return debugInfo;
    
  } catch (error) {
    console.error('[ReceiptValidation] Debug Fehler:', error);
    return { error: error?.toString() };
  }
};
