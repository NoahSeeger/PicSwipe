// hooks/useReviewPrompt.ts
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const REVIEW_PROMPT_SWIPES = 60; // Nach 60 Swipes fragen
const STORAGE_KEY_REVIEWED = "hasReviewed";
const STORAGE_KEY_LAST_PROMPT = "lastReviewPromptDate";
const STORAGE_KEY_PROMPT_COUNT = "reviewPromptCount";
const DAYS_BETWEEN_PROMPTS = 2; // Nach 2 Tagen nochmal fragen
const MAX_PROMPTS = 3; // Nach 70 Prompts aufhören

export const useReviewPrompt = (currentSwipes: number) => {
  useEffect(() => {
    const checkForReview = async () => {
      const hasReviewed = await AsyncStorage.getItem(STORAGE_KEY_REVIEWED);
      const lastPromptDate = await AsyncStorage.getItem(STORAGE_KEY_LAST_PROMPT);
      const promptCount = parseInt(await AsyncStorage.getItem(STORAGE_KEY_PROMPT_COUNT) || "0");

      // Wenn bereits reviewed, nie wieder fragen
      if (hasReviewed === "true") return;

      // Wenn schon zu oft gefragt wurde, aufhören
      if (promptCount >= MAX_PROMPTS) return;

      const today = new Date();
      const lastPrompt = lastPromptDate ? new Date(lastPromptDate) : null;
      const daysSinceLastPrompt = lastPrompt ? Math.floor((today.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;

      // Prüfe, ob genug Zeit vergangen ist
      const shouldShowPrompt = !lastPromptDate || daysSinceLastPrompt >= DAYS_BETWEEN_PROMPTS;

      if (currentSwipes >= REVIEW_PROMPT_SWIPES && shouldShowPrompt) {
        if (await StoreReview.hasAction()) {
          StoreReview.requestReview();

          // Update der Prompt-Statistiken
          await AsyncStorage.setItem(STORAGE_KEY_LAST_PROMPT, today.toISOString());
          await AsyncStorage.setItem(STORAGE_KEY_PROMPT_COUNT, (promptCount + 1).toString());

          console.log(`Review prompt #${promptCount + 1} angezeigt`);
        }
      }
    };

    checkForReview();
  }, [currentSwipes]);
};
