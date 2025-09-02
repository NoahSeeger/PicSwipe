import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, Linking, ActivityIndicator, Pressable } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SWIPE_LIMIT, useSwipeLimit } from "@/hooks/useSwipeLimit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ThemeProvider";
import { getCustomerInfoWithFallback, restorePurchasesWithFallback, debugReceiptValidation } from "@/utils/receiptValidation";
import { useI18n, useDateFormat } from "@/hooks/useI18n";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { changeLanguage } from "@/i18n";
import * as Haptics from "expo-haptics";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, language, isReady } = useI18n('settings');
  const { formatDate } = useDateFormat();
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

  // Debug-Funktion für Receipt Validation
  const debugReceipts = async () => {
    try {
      const debugInfo = await debugReceiptValidation();
      
      const message = JSON.stringify(debugInfo, null, 2);
      Alert.alert("Receipt Validation Debug", message);
      
      console.log('[Settings] Receipt Debug Info:', debugInfo);
    } catch (error) {
      Alert.alert("Debug Fehler", error?.toString() || "Unbekannter Fehler");
    }
  };

  // Button-Handler für Paywall
  const showPaywall = async () => {
    // try {
    //   const offerings = await Purchases.getOfferings();
    //   if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
    //     // Display packages for sale
    //     console.log('[Settings] Available packages:', offerings.current.availablePackages);
    //   }
    // } catch (e) {
    //   console.error('[Settings] Error showing paywall:', e);
    // }
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
  
  // Käufe wiederherstellen-Funktion mit verbesserter Receipt Validation
  const restorePurchases = async () => {
    try {
      setLoading(true);
      console.log('[Settings] Stelle Käufe wieder her...');
      
      const result = await restorePurchasesWithFallback();
      
      if (result.success && result.customerInfo) {
        // Aktualisiere Abo-Status nach Wiederherstellung
        await loadSubscriptionInfo();
        
        // Zeige Erfolgs- oder Info-Meldung
        if (result.customerInfo.entitlements.active["pro"]) {
          Alert.alert("Erfolg", "Pro-Zugang wurde wiederhergestellt!");
        } else {
          Alert.alert(t('subscription.alerts.information'), t('subscription.alerts.noPurchasesFound'));
        }
      } else {
        Alert.alert("Fehler", `Käufe konnten nicht wiederhergestellt werden: ${result.error}`);
      }
    } catch (e: any) {
      const msg = typeof e === "object" && e && "message" in e ? (e as any).message : String(e);
      Alert.alert(t('subscription.alerts.error'), t('subscription.alerts.restoreError') + ": " + msg);
    } finally {
      setLoading(false);
    }
  };

  // Lädt Informationen zum Abo aus RevenueCat mit verbesserter Receipt Validation
  const loadSubscriptionInfo = async () => {
    setLoading(true);
    try {
      console.log('[Settings] Lade Abo-Informationen...');
      
      const result = await getCustomerInfoWithFallback();
      
      if (result.success && result.customerInfo) {
        const customerInfo = result.customerInfo;
        
        // Prüfe ob Pro-Entitlement aktiv ist
        const proEntitlement = customerInfo.entitlements.active["pro"];
        const isActive = proEntitlement != null;
        
        // Hole Produktname und Ablaufdatum, falls vorhanden
        let productName = t('subscription.products.noSubscription');
        let expirationDate = null;
        
        if (isActive && proEntitlement) {
          // Setze Produktname basierend auf der productIdentifier
          if (proEntitlement.productIdentifier === "pro_monthly") {
            productName = t('subscription.products.proMonthly');
          } else if (proEntitlement.productIdentifier === "pro_lifetime") {
            productName = t('subscription.products.proLifetime');
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
        
        if (result.wasFromSandbox) {
          console.log('[Settings] Abo-Info aus Sandbox-Fallback geladen');
        }
        
      } else {
        console.error('[Settings] Fehler beim Laden der Abo-Informationen:', result.error);
        Alert.alert(t('subscription.alerts.error'), `${t('subscription.alerts.subscriptionInfoError')}: ${result.error}`);
      }
      
    } catch (error) {
      console.error("Unerwarteter Fehler beim Laden der Abo-Informationen:", error);
      Alert.alert(t('subscription.alerts.error'), t('subscription.alerts.subscriptionInfoError'));
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
        Alert.alert(t('subscription.alerts.error'), t('subscription.alerts.manageError'));
      });
    } catch (error) {
      console.error("Fehler beim Öffnen der Abo-Verwaltung:", error);
      Alert.alert(t('subscription.alerts.error'), t('subscription.alerts.manageErrorGeneral'));
    }
  };

  // Sprachen-Optionen
  const languages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === language) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await changeLanguage(languageCode);
      
      Alert.alert(
        t('language.title'),
        `Sprache wurde geändert`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error changing language:', error);
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
    languageSection: {
      gap: 8,
    },
    languageOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginBottom: 4,
    },
    languageOptionActive: {
      backgroundColor: colors.primary + '20',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    languageFlag: {
      fontSize: 20,
      marginRight: 12,
    },
    languageText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
  });

  // Warte bis i18n initialisiert ist
  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      
      {/* Abonnement-Sektion */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('subscription.title')}</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text, marginTop: 10 }}>{t('subscription.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.subscriptionInfo}>
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>{t('subscription.status')}:</Text>
                <Text style={[
                  styles.subscriptionValue, 
                  subscription.isActive ? styles.proStatus : {}
                ]}>
                  {subscription.isActive ? t('subscription.active') : t('subscription.inactive')}
                </Text>
              </View>
              
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>{t('subscription.product')}:</Text>
                <Text style={styles.subscriptionValue}>{subscription.productName}</Text>
              </View>
              
              {subscription.expirationDate && (
                <View style={styles.subscriptionRow}>
                  <Text style={styles.subscriptionLabel}>{t('subscription.nextPayment')}:</Text>
                  <Text style={styles.subscriptionValue}>
                    {formatDate(subscription.expirationDate)}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.manageButton} onPress={manageSubscription}>
                <Text style={styles.manageButtonText}>{t('settings:subscription.manage')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.manageButton]} 
                onPress={restorePurchases}>
                <Text style={styles.manageButtonText}>{t('settings:subscription.restore')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      
      {/* Sprach-Sektion */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('language.title')}</Text>
        <View style={styles.languageSection}>
          {languages.map((lang) => {
            const isActive = language === lang.code;
            
            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.languageOption,
                  isActive && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={styles.languageText}>{lang.name}</Text>
                {isActive && (
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
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
          <Text style={[styles.button, { backgroundColor: colors.primary }]} onPress={debugReceipts}>
            🐛 Receipt Validation Debug
          </Text>
        </View>
      </View>
    </View>
  );
}
