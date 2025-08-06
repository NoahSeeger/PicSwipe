import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as MediaLibrary from "expo-media-library";
import { Platform, Alert, Linking } from "react-native";

type PermissionStatus = MediaLibrary.PermissionStatus;

type PermissionContextType = {
  permissionStatus: PermissionStatus | null;
  isLoading: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  checkPermissions: () => Promise<PermissionStatus>;
  showSettingsAlert: () => void;
  canRequestPermission: boolean;
};

const PhotoPermissionContext = createContext<PermissionContextType | null>(
  null
);

type PhotoPermissionProviderProps = {
  children: React.ReactNode;
};

export const PhotoPermissionProvider: React.FC<
  PhotoPermissionProviderProps
> = ({ children }) => {
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRequestedOnce, setHasRequestedOnce] = useState(false);

  const checkPermissions = useCallback(async (): Promise<PermissionStatus> => {
    try {
      console.log("🔍 Checking photo permissions...");
      setIsLoading(true);

      const { status } = await MediaLibrary.getPermissionsAsync();
      console.log("📱 Current permission status:", status);

      setPermissionStatus(status);
      return status;
    } catch (error) {
      console.error("❌ Error checking permissions:", error);
      setPermissionStatus("denied");
      return "denied";
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log("🙋‍♂️ Requesting photo permissions...");
      setIsLoading(true);
      setHasRequestedOnce(true);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log("📝 New permission status:", status);

      setPermissionStatus(status);

      // Auf iOS, wenn der User "Don't Allow" wählt, wird der Status 'denied'
      // Nach dem ersten Deny kann man nicht mehr programmatisch fragen
      if (status === "denied" && Platform.OS === "ios") {
        setTimeout(() => {
          showSettingsAlert();
        }, 500);
      }

      return status === "granted";
    } catch (error) {
      console.error("❌ Error requesting permissions:", error);
      setPermissionStatus("denied");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showSettingsAlert = useCallback(() => {
    Alert.alert(
      "Foto-Zugriff erforderlich",
      "PicSwipe benötigt Zugriff auf deine Fotos, um funktionieren zu können. Bitte erlaube den Zugriff in den Einstellungen.",
      [
        {
          text: "Abbrechen",
          style: "cancel",
        },
        {
          text: "Einstellungen",
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  }, []);

  // Initial permission check beim App-Start
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const contextValue: PermissionContextType = {
    permissionStatus,
    isLoading,
    hasPermission: permissionStatus === "granted",
    requestPermission,
    checkPermissions,
    showSettingsAlert,
    canRequestPermission:
      permissionStatus === "undetermined" ||
      (permissionStatus === "denied" &&
        !hasRequestedOnce &&
        Platform.OS === "android"),
  };

  return (
    <PhotoPermissionContext.Provider value={contextValue}>
      {children}
    </PhotoPermissionContext.Provider>
  );
};

// Hook für die Verwendung des Contexts
export const usePhotoPermission = (): PermissionContextType => {
  const context = useContext(PhotoPermissionContext);

  if (!context) {
    throw new Error(
      "usePhotoPermission must be used within a PhotoPermissionProvider"
    );
  }

  return context;
};

// HOC für Komponenten, die Permissions benötigen
export const withPhotoPermission = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return (props: P) => {
    const { hasPermission } = usePhotoPermission();

    if (!hasPermission) {
      return null; // oder eine Fallback-Komponente
    }

    return <WrappedComponent {...props} />;
  };
};
