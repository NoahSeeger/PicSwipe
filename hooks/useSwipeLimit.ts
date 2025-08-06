// hooks/useSwipeLimit.ts
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from "react-native-purchases";

const SWIPE_LIMIT = 5;

export const useSwipeLimit = () => {
  const [swipes, setSwipes] = useState(0);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const checkEntitlement = async () => {
      const info = await Purchases.getCustomerInfo();
      setIsPro(info.entitlements.active.pro != null);
    };

    const loadSwipes = async () => {
      const today = new Date().toDateString();
      const storedDate = await AsyncStorage.getItem("swipe_date");
      if (storedDate !== today) {
        await AsyncStorage.setItem("swipe_date", today);
        await AsyncStorage.setItem("swipe_count", "0");
        setSwipes(0);
      } else {
        const count = await AsyncStorage.getItem("swipe_count");
        setSwipes(Number(count) || 0);
      }
    };

    checkEntitlement();
    loadSwipes();
  }, []);

  const incrementSwipe = async () => {
    const newCount = swipes + 1;
    setSwipes(newCount);
    await AsyncStorage.setItem("swipe_count", newCount.toString());
  };

  const hasReachedLimit = !isPro && swipes >= SWIPE_LIMIT;

  return { swipes, incrementSwipe, hasReachedLimit, isPro };
};
