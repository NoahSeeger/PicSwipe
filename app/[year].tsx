import { useLocalSearchParams, router } from "expo-router";
import { MonthsView } from "@/components/home/MonthsView";

export default function MonthsScreen() {
  const { year } = useLocalSearchParams<{ year: string }>();

  return (
    <MonthsView
      year={parseInt(year)}
      onClose={() => router.back()}
    />
  );
}
