import React, { useRef, useEffect, useState } from "react";
import {
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  View,
  ImageURISource,
} from "react-native";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { IconSymbol } from "../ui/IconSymbol";
import { ThemedText } from "../ThemedText";

const { width, height } = Dimensions.get("window");
const CONTAINER_WIDTH = width * 0.9;
const MAX_HEIGHT = height * 0.7;
const SWIPE_THRESHOLD = width * 0.3;

type Props = {
  uri: string;
  nextPhotos: string[];
  onSwipe: (direction: "left" | "right") => void;
  onPress: () => void;
};

// Statische Basis-Styles
const baseStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  overlayText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
});

export const SwipeablePhoto = ({
  uri,
  nextPhotos,
  onSwipe,
  onPress,
}: Props) => {
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const isAnimatingRef = useRef(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({
    width: CONTAINER_WIDTH,
    height: CONTAINER_WIDTH,
  });

  useEffect(() => {
    if (nextPhotos[0]) {
      Image.prefetch(nextPhotos[0]).catch(() => {});
    }
  }, [nextPhotos]);

  useEffect(() => {
    Image.getSize(
      uri,
      (originalWidth, originalHeight) => {
        const aspectRatio = originalWidth / originalHeight;
        let newWidth = CONTAINER_WIDTH;
        let newHeight = CONTAINER_WIDTH / aspectRatio;

        if (newHeight > MAX_HEIGHT) {
          newHeight = MAX_HEIGHT;
          newWidth = MAX_HEIGHT * aspectRatio;

          if (newWidth > CONTAINER_WIDTH) {
            newWidth = CONTAINER_WIDTH;
            newHeight = CONTAINER_WIDTH / aspectRatio;
          }
        }

        setImageSize({ width: originalWidth, height: originalHeight });
        setContainerSize({ width: newWidth, height: newHeight });
      },
      () => {
        setContainerSize({ width: CONTAINER_WIDTH, height: CONTAINER_WIDTH });
      }
    );
  }, [uri]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, ctx) => {
      if (isAnimatingRef.current) return;
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      if (isAnimatingRef.current) return;
      translateX.value = ctx.startX + event.translationX;
      rotation.value = interpolate(
        event.translationX,
        [-width, 0, width],
        [-15, 0, 15]
      );
    },
    onEnd: (event) => {
      if (isAnimatingRef.current) return;

      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        isAnimatingRef.current = true;
        const direction = event.translationX > 0 ? "right" : "left";

        runOnJS(onSwipe)(direction);

        translateX.value = withSpring(
          direction === "right" ? width * 1.5 : -width * 1.5,
          {
            velocity: event.velocityX,
            stiffness: 200,
            damping: 20,
            overshootClamping: true,
          },
          () => {
            translateX.value = 0;
            rotation.value = 0;
            isAnimatingRef.current = false;
          }
        );
      } else {
        translateX.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    },
  });

  const mainCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const trashOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
      [1, 0.5, 0]
    ),
    backgroundColor: "rgba(255, 59, 48, 0.4)",
  }));

  const keepOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
      [0, 0.5, 1]
    ),
    backgroundColor: "rgba(52, 199, 89, 0.4)",
  }));

  // Dynamische Styles basierend auf containerSize
  const getStyles = (size: { width: number; height: number }) => ({
    container: {
      width: size.width,
      height: size.height,
      alignItems: "center",
      justifyContent: "center",
    },
    photoWrapper: {
      width: size.width,
      height: size.height,
    },
    photo: {
      width: size.width,
      height: size.height,
      borderRadius: 12,
      backgroundColor: "white",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  });

  const dynamicStyles = getStyles(containerSize);

  return (
    <View style={dynamicStyles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[dynamicStyles.photoWrapper, mainCardStyle]}>
          <TouchableOpacity onPress={onPress} activeOpacity={1}>
            <Image
              source={{ uri }}
              style={dynamicStyles.photo}
              resizeMode="contain"
            />

            <Animated.View style={[baseStyles.overlay, trashOverlayStyle]}>
              <IconSymbol name="trash" size={48} color="white" />
              <ThemedText style={baseStyles.overlayText}>Trash</ThemedText>
            </Animated.View>

            <Animated.View style={[baseStyles.overlay, keepOverlayStyle]}>
              <IconSymbol
                name="square.and.arrow.down"
                size={48}
                color="white"
              />
              <ThemedText style={baseStyles.overlayText}>Keep</ThemedText>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};
