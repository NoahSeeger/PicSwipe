import React, { useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Text,
} from "react-native";
import { useMonthData } from "@/hooks/useMonthData";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YearListItem } from "@/components/home/YearListItem";
import { router } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import { useTheme } from "@/components/ThemeProvider";

export default function HomeScreen() {
  const { yearData, isLoading, refreshData } = useMonthData();
  const insets = useSafeAreaInsets();
  const totalPhotos = yearData.reduce((sum, year) => sum + year.totalPhotos, 0);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: ["photo"],
          first: 20,
        });
      }
    })();
  }, []);

  const handleYearPress = (year: number) => {
    router.push({
      pathname: "/[year]",
      params: { year: year.toString() },
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    },
    loadingText: {
      fontSize: 16,
      opacity: 0.8,
      color: colors.text,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      marginBottom: 20,
      paddingTop: 4,
    },
    title: {
      fontSize: 34,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
      includeFontPadding: false,
      lineHeight: 41,
    },
    subtitle: {
      fontSize: 17,
      opacity: 0.6,
      color: colors.text,
    },
    listContainer: {
      paddingHorizontal: 16,
      gap: 12,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {isLoading ? (
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 8 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Lade Fotos...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshData}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Fotos</Text>
            <Text style={styles.subtitle}>
              {totalPhotos.toLocaleString()} Fotos insgesamt
            </Text>
          </View>

          <View style={styles.listContainer}>
            {yearData.map((year) => (
              <YearListItem
                key={year.year}
                year={year.year}
                months={year.months}
                totalPhotos={year.totalPhotos}
                onPress={() => handleYearPress(year.year)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
