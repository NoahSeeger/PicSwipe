// utils/receiptValidation.ts
import Purchases from "react-native-purchases";
import { Platform } from "react-native";

/**
 * Einfache Receipt Validation
 */

export interface ReceiptValidationResult {
  success: boolean;
  error?: string;
  customerInfo?: any;
}

/**
 * Einfache CustomerInfo Abfrage
 */
export const getCustomerInfoWithFallback = async (): Promise<ReceiptValidationResult> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    return {
      success: true,
      customerInfo
    };

  } catch (error: any) {
    console.error('[ReceiptValidation] Fehler beim Laden der CustomerInfo:', error);

    return {
      success: false,
      error: error?.message || error?.toString() || 'Unknown error'
    };
  }
};

/**
 * Einfache Restore Purchases Funktion
 */
export const restorePurchasesWithFallback = async (): Promise<ReceiptValidationResult> => {
  try {
    const customerInfo = await Purchases.restorePurchases();

    return {
      success: true,
      customerInfo
    };

  } catch (error: any) {
    console.error('[ReceiptValidation] Fehler beim Wiederherstellen:', error);

    return {
      success: false,
      error: error?.message || error?.toString() || 'Unknown error'
    };
  }
};

/**
 * Debugging-Funktion für Receipt Validation Probleme
 */
export const debugReceiptValidation = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    const debugInfo = {
      platform: Platform.OS,
      originalAppUserId: customerInfo.originalAppUserId,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
      allEntitlements: Object.keys(customerInfo.entitlements.all)
    };

    return debugInfo;

  } catch (error) {
    console.error('[ReceiptValidation] Debug Fehler:', error);
    return { error: error?.toString() };
  }
};