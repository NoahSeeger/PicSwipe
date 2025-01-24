import { useState, useEffect } from "react";
import * as MediaLibrary from "expo-media-library";

export const usePhotoPermission = () => {
  const [permissionStatus, setPermissionStatus] =
    useState<MediaLibrary.PermissionStatus | null>(null);

  // Prüfe Berechtigungen beim Hook-Start
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    console.log("Checking photo permissions...");
    const { status } = await MediaLibrary.getPermissionsAsync();
    console.log("Current permission status:", status);
    setPermissionStatus(status);
    return status;
  };

  const requestPermission = async () => {
    console.log("Requesting photo permissions...");
    const { status } = await MediaLibrary.requestPermissionsAsync();
    console.log("New permission status:", status);
    setPermissionStatus(status);
    return status;
  };

  return {
    permissionStatus,
    requestPermission,
    checkPermissions,
  };
};
