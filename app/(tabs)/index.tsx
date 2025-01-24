import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { ThemedView } from "../../components/ThemedView";
import { ThemedText } from "../../components/ThemedText";
import { useMonthData } from "../../hooks/useMonthData";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YearListItem } from "../../components/home/YearListItem";
import { MonthsView } from "../../components/home/MonthsView";
import { router } from "expo-router";
import * as MediaLibrary from "expo-media-library";

export default function HomeScreen() {
  const { yearData, isLoading, refreshData } = useMonthData();
  const insets = useSafeAreaInsets();
  const totalPhotos = yearData.reduce((sum, year) => sum + year.totalPhotos, 0);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        const media = await MediaLibrary.getAssetsAsync({
          mediaType: ["photo"],
          first: 20, // Anzahl der Fotos
        });
        console.log("Gefundene Medien:", media); // Zum Debuggen
      }
    })();
  }, []);

  const handleYearPress = (year: number, months: any[]) => {
    router.push({
      pathname: "/year/[year]",
      params: { year },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {isLoading ? (
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 8 }]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Lade Fotos...</ThemedText>
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
              tintColor="#007AFF"
            />
          }
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>Fotos</ThemedText>
            <ThemedText style={styles.subtitle}>
              {totalPhotos.toLocaleString()} Fotos insgesamt
            </ThemedText>
          </View>

          <View style={styles.listContainer}>
            {yearData.map((year) => (
              <YearListItem
                key={year.year}
                year={year.year}
                months={year.months}
                totalPhotos={year.totalPhotos}
                onPress={() => handleYearPress(year.year, year.months)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
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
    color: "#fff",
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
    color: "#fff",
    marginBottom: 8,
    includeFontPadding: false,
    lineHeight: 41,
  },
  subtitle: {
    fontSize: 17,
    opacity: 0.6,
    color: "#fff",
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
