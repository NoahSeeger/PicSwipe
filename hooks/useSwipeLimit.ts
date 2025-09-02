// hooks/useSwipeLimit.ts
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from "react-native-purchases";
import { getCustomerInfoWithFallback } from "@/utils/receiptValidation";

export const SWIPE_LIMIT = 100;

export const useSwipeLimit = () => {
  const [swipes, setSwipes] = useState(0);
  const [isPro, setIsPro] = useState(false);

  // Pro-Status mit verbesserter Receipt Validation neu laden
  const refreshProStatus = async () => {
    console.log('[SwipeLimit] Aktualisiere Pro-Status...');

    const result = await getCustomerInfoWithFallback();

    if (result.success && result.customerInfo) {
      const isProActive = result.customerInfo.entitlements.active.pro != null;
      setIsPro(isProActive);

      console.log('[SwipeLimit] Pro-Status aktualisiert:', {
        isPro: isProActive,
        activeEntitlements: Object.keys(result.customerInfo.entitlements.active)
      });

      return isProActive;
    } else {
      console.error('[SwipeLimit] Pro-Status konnte nicht geladen werden:', result.error);
      // Bei Fehlern Pro-Status nicht ändern
      return isPro;
    }
  };  // Swipes und Pro-Status laden
  const loadSwipes = async () => {
    const today = new Date().toDateString();
    const storedDate = await AsyncStorage.getItem("swipe_date");
    if (storedDate !== today) {
      await AsyncStorage.setItem("swipe_date", today);
      await AsyncStorage.setItem("swipe_count", "0");
      setSwipes(0);
      console.log('[SwipeLimit] Neuer Tag, Swipes auf 0 gesetzt');
    } else {
      const count = await AsyncStorage.getItem("swipe_count");
      setSwipes(Number(count) || 0);
      console.log('[SwipeLimit] Swipes geladen:', count);
    }
    await refreshProStatus();
  };

  useEffect(() => {
    loadSwipes();
  }, []);

  const incrementSwipe = async () => {
    const newCount = swipes + 1;
    setSwipes(newCount);
    await AsyncStorage.setItem("swipe_count", newCount.toString());
    console.log('[SwipeLimit] Swipe erhöht:', newCount);
  };

  const hasReachedLimit = !isPro && swipes >= SWIPE_LIMIT;
  console.log('[SwipeLimit] Aktueller Stand:', { swipes, SWIPE_LIMIT, isPro, hasReachedLimit });

  return { swipes, incrementSwipe, hasReachedLimit, isPro, loadSwipes, refreshProStatus };
};
