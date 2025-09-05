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
import { useI18n } from "@/hooks/useI18n";

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
  const { t } = useI18n('common');
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
        return t('permissions.undeterminedMessage');
      case "denied":
        return t('permissions.deniedMessage');
      default:
        return t('permissions.defaultMessage');
    }
  };

  const getButtonText = () => {
    if (customButtonText) return customButtonText;

    if (permissionStatus === "denied" && !canRequestPermission) {
      return t('permissions.openSettings');
    }
    return t('permissions.continue');
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
            ? t('permissions.welcome')
            : t('permissions.photoAccess')}
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
                {t('permissions.features.managePhotos')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                {t('permissions.features.saveSpace')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                {t('permissions.features.organizeGallery')}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { marginTop: 50 }]}
          onPress={handleButtonPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
