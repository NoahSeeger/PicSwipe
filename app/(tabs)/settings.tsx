import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SWIPE_LIMIT, useSwipeLimit } from "@/hooks/useSwipeLimit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ThemeProvider";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { loadSwipes } = useSwipeLimit();
  
  // State für RevenueCat-Informationen
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<{
    isActive: boolean;
    productName: string;
    expirationDate: Date | null;
  }>({
    isActive: false,
    productName: "",
    expirationDate: null,
  });

  const reachSwipeLimit = async () => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem("swipe_date", today);
      await AsyncStorage.setItem("swipe_count", SWIPE_LIMIT.toString());
      await loadSwipes();
      Alert.alert(
        "Swipes erreicht",
        `Du hast jetzt das Tageslimit von ${SWIPE_LIMIT} Swipes erreicht. Die Paywall sollte nun erscheinen, wenn du weiter swipest.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Fehler", "Konnte Swipes nicht setzen");
    }
  };

  // Button-Handler für Paywall
  const showPaywall = async () => {
    try {
      await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: "pro",
      });
      // Nach Kauf Subscription-Daten aktualisieren
      await loadSubscriptionInfo();
    } catch (e: any) {
      const msg = typeof e === "object" && e && "message" in e ? (e as any).message : String(e);
      Alert.alert("Fehler", "Paywall konnte nicht angezeigt werden: " + msg);
    }
  };
  
  // Käufe wiederherstellen-Funktion
  const restorePurchases = async () => {
    try {
      setLoading(true);
      // RevenueCat's Methode zum Wiederherstellen von Käufen
      const customerInfo = await Purchases.restorePurchases();
      
      // Aktualisiere Abo-Status nach Wiederherstellung
      await loadSubscriptionInfo();
      
      // Zeige Erfolgs- oder Info-Meldung
      if (customerInfo.entitlements.active["pro"]) {
        Alert.alert("Erfolg", "Pro-Zugang wurde wiederhergestellt!");
      } else {
        Alert.alert("Information", "Keine Pro-Käufe gefunden, die wiederhergestellt werden könnten.");
      }
    } catch (e: any) {
      const msg = typeof e === "object" && e && "message" in e ? (e as any).message : String(e);
      Alert.alert("Fehler", "Käufe konnten nicht wiederhergestellt werden: " + msg);
    } finally {
      setLoading(false);
    }
  };

  // Lädt Informationen zum Abo aus RevenueCat
  const loadSubscriptionInfo = async () => {
    setLoading(true);
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Prüfe ob Pro-Entitlement aktiv ist
      const proEntitlement = customerInfo.entitlements.active["pro"];
      const isActive = proEntitlement != null;
      
      // Hole Produktname und Ablaufdatum, falls vorhanden
      let productName = "Kein Abo";
      let expirationDate = null;
      
      if (isActive && proEntitlement) {
        // Setze Produktname basierend auf der productIdentifier
        if (proEntitlement.productIdentifier === "pro_monthly") {
          productName = "Pro Monatsabo";
        } else if (proEntitlement.productIdentifier === "pro_lifetime") {
          productName = "Pro Lebenslanger Zugang";
        } else {
          productName = proEntitlement.productIdentifier || "Pro";
        }
        
        // Ablaufdatum (null bei lifetime)
        if (proEntitlement.expirationDate) {
          // Convert the ISO string to a Date
          expirationDate = new Date(proEntitlement.expirationDate);
        }
      }
      
      setSubscription({
        isActive,
        productName,
        expirationDate
      });
      
    } catch (error) {
      console.error("Fehler beim Laden der Abo-Informationen:", error);
      Alert.alert("Fehler", "Abo-Informationen konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };
  
  // Öffnet die Abo-Verwaltungsseite
  const manageSubscription = async () => {
    try {
      // Auf iOS können wir den Apple-Abo-Verwaltungsbildschirm öffnen
      // Auf Android müssen wir manuell zur Google Play Store-Abo-Seite navigieren
      
      // Öffne die URL zur Abo-Verwaltung
      const subscriptionUrl = 'https://apps.apple.com/account/subscriptions';
      Linking.openURL(subscriptionUrl).catch(err => {
        console.error("Konnte URL nicht öffnen:", err);
        Alert.alert("Fehler", "Abo-Verwaltungsseite konnte nicht geöffnet werden");
      });
    } catch (error) {
      console.error("Fehler beim Öffnen der Abo-Verwaltung:", error);
      Alert.alert("Fehler", "Abo-Verwaltung konnte nicht geöffnet werden");
    }
  };
  
  // Lade Abo-Informationen beim ersten Laden und bei jedem Focus
  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingTop: insets.top,
      backgroundColor: colors.background,
    },
    section: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 15,
      color: colors.text,
    },
    devOptions: {
      gap: 10,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      color: "#FFFFFF",
      textAlign: "center",
    },
    buttonDisabled: {
      backgroundColor: colors.secondary,
      opacity: 0.5,
    },
    subscriptionInfo: {
      marginTop: 10,
      padding: 15,
      backgroundColor: colors.card,
      borderRadius: 8,
    },
    subscriptionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    subscriptionLabel: {
      color: colors.text,
      fontWeight: "500",
      fontSize: 16,
    },
    subscriptionValue: {
      color: colors.text,
      fontSize: 16,
    },
    manageButton: {
      backgroundColor: colors.primary,
      marginTop: 10,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    manageButtonText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 16,
    },
    proStatus: {
      fontWeight: "bold",
      color: colors.primary,
    },
    loadingContainer: {
      padding: 20,
      alignItems: "center",
    },
    restoreButton: {
      backgroundColor: colors.secondary,
      marginTop: 10,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>
      
      {/* Abonnement-Sektion */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Abonnement-Status</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text, marginTop: 10 }}>Lade Abo-Informationen...</Text>
          </View>
        ) : (
          <>
            <View style={styles.subscriptionInfo}>
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Status:</Text>
                <Text style={[
                  styles.subscriptionValue, 
                  subscription.isActive ? styles.proStatus : {}
                ]}>
                  {subscription.isActive ? "Aktiv" : "Inaktiv"}
                </Text>
              </View>
              
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Produkt:</Text>
                <Text style={styles.subscriptionValue}>{subscription.productName}</Text>
              </View>
              
              {subscription.expirationDate && (
                <View style={styles.subscriptionRow}>
                  <Text style={styles.subscriptionLabel}>Nächste Zahlung:</Text>
                  <Text style={styles.subscriptionValue}>
                    {subscription.expirationDate.toLocaleDateString()}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.manageButton} onPress={manageSubscription}>
                <Text style={styles.manageButtonText}>Abo verwalten</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.manageButton]} 
                onPress={restorePurchases}>
                <Text style={styles.manageButtonText}>Käufe wiederherstellen</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      
      {/* Entwickleroptionen */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entwickleroptionen</Text>
        <View style={styles.devOptions}>
          {/* <Text style={styles.button} onPress={resetOnboarding}>
            Onboarding zurücksetzen
          </Text> */}
          <Text style={styles.button} onPress={reachSwipeLimit}>
            Swipes-Limit für Paywall-Test erreichen
          </Text>
          <Text style={styles.button} onPress={showPaywall}>
            Pro kaufen (Paywall anzeigen)
          </Text>
          <Text style={styles.button} onPress={loadSubscriptionInfo}>
            Abo-Status neu laden
          </Text>
        </View>
      </View>
    </View>
  );
}
