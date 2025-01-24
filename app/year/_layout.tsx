import { Stack } from "expo-router";

export default function YearLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000" },
        animation: "slide_from_right",
        animationDuration: 200,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        presentation: "card",
      }}
    />
  );
}
