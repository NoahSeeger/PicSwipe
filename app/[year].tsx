import { useLocalSearchParams, router } from "expo-router";
import { MonthsView } from "@/components/home/MonthsView";
import { useMonthData } from "@/hooks/useMonthData";

export default function MonthsScreen() {
  const { year } = useLocalSearchParams<{ year: string }>();
  const { yearData } = useMonthData();
  const yearInfo = yearData.find((y) => y.year === parseInt(year));

  if (!yearInfo) return null;

  return (
    <MonthsView
      year={yearInfo.year}
      months={yearInfo.months}
      onClose={() => router.back()}
    />
  );
}
