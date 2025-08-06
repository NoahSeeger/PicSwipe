import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/components/ThemeProvider";
import { usePhotoPermission } from "@/components/PhotoPermissionProvider";

const { width, height } = Dimensions.get("window");

type PermissionGuardProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoadingSpinner?: boolean;
  customMessage?: string;
  customButtonText?: string;
};

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  fallback,
  showLoadingSpinner = true,
  customMessage,
  customButtonText,
}) => {
  const { colors, isDark } = useTheme();
  const {
    permissionStatus,
    isLoading,
    hasPermission,
    requestPermission,
    showSettingsAlert,
    canRequestPermission,
  } = usePhotoPermission();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    gradientBackground: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: height * 0.4,
      opacity: 0.1,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${colors.primary}20`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 16,
    },
    message: {
      fontSize: 16,
      color: colors.secondary || colors.text,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 40,
      maxWidth: width * 0.8,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 25,
      minWidth: 200,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    buttonText: {
      color: "white",
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
    },
    secondaryButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: `${colors.text}30`,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      textAlign: "center",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.secondary || colors.text,
    },
    featureList: {
      alignItems: "flex-start",
      marginTop: 20,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    featureText: {
      marginLeft: 12,
      fontSize: 14,
      color: colors.secondary || colors.text,
    },
  });

  // Loading State
  if (isLoading && showLoadingSpinner) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Überprüfe Berechtigungen...</Text>
      </View>
    );
  }

  // Permission granted - show children
  if (hasPermission) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Permission denied or undetermined - show permission request UI
  const getMessage = () => {
    if (customMessage) return customMessage;

    switch (permissionStatus) {
      case "undetermined":
        return "Damit du PicSwipe nutzen kannst, benötigen wir Zugriff auf deine Fotos. So können wir dir helfen, deine Galerie zu organisieren und Speicherplatz zu sparen.";
      case "denied":
        return "PicSwipe benötigt Zugriff auf deine Fotos, um funktionieren zu können. Bitte erlaube den Zugriff in den Einstellungen.";
      default:
        return "Um fortzufahren, wird Zugriff auf deine Fotos benötigt.";
    }
  };

  const getButtonText = () => {
    if (customButtonText) return customButtonText;

    if (permissionStatus === "denied" && !canRequestPermission) {
      return "Einstellungen öffnen";
    }
    return "Foto-Zugriff erlauben";
  };

  const handleButtonPress = async () => {
    if (permissionStatus === "denied" && !canRequestPermission) {
      showSettingsAlert();
    } else {
      await requestPermission();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.permissionContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="images-outline" size={60} color={colors.primary} />
        </View>

        <Text style={styles.title}>
          {permissionStatus === "undetermined"
            ? "Willkommen bei PicSwipe!"
            : "Zugriff erforderlich"}
        </Text>

        <Text style={styles.message}>{getMessage()}</Text>

        {permissionStatus === "undetermined" && (
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                Fotos sicher und lokal verwalten
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                Speicherplatz durch Duplikate sparen
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                Galerie schnell organisieren
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleButtonPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>

        {permissionStatus === "undetermined" && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              /* Optional: Mehr Infos */
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>
              Warum wird das benötigt?
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
