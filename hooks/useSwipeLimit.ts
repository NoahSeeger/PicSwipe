// hooks/useSwipeLimit.ts
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from "react-native-purchases";

export const SWIPE_LIMIT = 100;

export const useSwipeLimit = () => {
  const [swipes, setSwipes] = useState(0);
  const [isPro, setIsPro] = useState(false);

  // loadSwipes jetzt im Funktionsscope, damit von außen nutzbar
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
  };

  useEffect(() => {
    const checkEntitlement = async () => {
      const info = await Purchases.getCustomerInfo();
      setIsPro(info.entitlements.active.pro != null);
    };
    checkEntitlement();
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

  return { swipes, incrementSwipe, hasReachedLimit, isPro, loadSwipes };
};
