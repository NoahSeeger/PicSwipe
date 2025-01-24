import React, { useState } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  interpolate,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./ui/IconSymbol";
import * as MediaLibrary from "expo-media-library";
import { usePhotoPermission } from "../hooks/usePhotoPermission";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  icon: string;
  isPermissionSlide?: boolean;
};

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    title: "Willkommen bei PicSwipe",
    description: "Deine Fotos. Dein Speicherplatz. Deine Kontrolle.",
    icon: "hand.wave.fill",
  },
  {
    id: "2",
    title: "Speicherplatz optimieren",
    description:
      "Identifiziere und entferne unerwünschte Fotos mit einer einfachen Wischgeste. Behalte nur die Momente, die dir wirklich wichtig sind.",
    icon: "photo.stack.fill",
  },
  {
    id: "3",
    title: "Fotos Zugriff",
    description:
      "Um deine Galerie zu optimieren, benötigen wir Zugriff auf deine Fotos. Deine Privatsphäre ist uns wichtig - du behältst immer die volle Kontrolle.",
    icon: "lock.shield.fill",
    isPermissionSlide: true,
  },
  {
    id: "4",
    title: "Los geht's!",
    description:
      "Bereit, deinen Fotospeicher zu optimieren? Lass uns anfangen!",
    icon: "sparkles",
  },
];

type Props = {
  onComplete: () => void;
};

export const Onboarding = ({ onComplete }: Props) => {
  const translateX = useSharedValue(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const { permissionStatus, requestPermission } = usePhotoPermission();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      translateX.value = event.contentOffset.x;
      const index = Math.round(event.contentOffset.x / width);
      if (currentSlideIndex !== index) {
        runOnJS(setCurrentSlideIndex)(index);
        runOnJS(Haptics.selectionAsync)();
      }
    },
  });

  const handlePermissionRequest = async () => {
    await requestPermission();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const iconStyle = useAnimatedStyle(() => {
      const scale = interpolate(translateX.value, inputRange, [0.5, 1, 0.5], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      const opacity = interpolate(translateX.value, inputRange, [0, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

      return {
        transform: [{ scale: withSpring(scale) }],
        opacity: withSpring(opacity),
      };
    });

    return (
      <View key={slide.id} style={styles.slide}>
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <IconSymbol name={slide.icon} size={64} color="#007AFF" />
        </Animated.View>

        <ThemedText style={styles.title}>{slide.title}</ThemedText>
        <ThemedText style={styles.description}>{slide.description}</ThemedText>

        {slide.isPermissionSlide ? (
          <Animated.View style={[styles.buttonContainer, iconStyle]}>
            <ThemedText
              style={[
                styles.button,
                permissionStatus === "granted" && styles.buttonDisabled,
              ]}
              onPress={handlePermissionRequest}
            >
              {permissionStatus === "granted"
                ? "Zugriff gewährt ✓"
                : "Fotos Zugriff erlauben"}
            </ThemedText>
          </Animated.View>
        ) : (
          slide.id === "4" && (
            <Animated.View style={[styles.buttonContainer, iconStyle]}>
              <ThemedText
                style={[
                  styles.button,
                  permissionStatus !== "granted" && styles.buttonDisabled,
                ]}
                onPress={
                  permissionStatus === "granted" ? onComplete : undefined
                }
              >
                Loslegen
              </ThemedText>
            </Animated.View>
          )
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => renderSlide(slide, index))}
      </Animated.ScrollView>

      <View style={styles.pagination}>
        {SLIDES.map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.paginationDot,
              currentSlideIndex === index && styles.paginationDotActive,
              useAnimatedStyle(() => ({
                transform: [
                  {
                    scale: withSpring(currentSlideIndex === index ? 1.2 : 1, {
                      damping: 15,
                      stiffness: 100,
                    }),
                  },
                ],
              })),
            ]}
          />
        ))}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121214",
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height: height * 0.8,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0, 122, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.2)",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    color: "#E0E0E0",
    paddingHorizontal: 24,
    letterSpacing: 0.3,
  },
  buttonContainer: {
    marginTop: 40,
    width: "100%",
    alignItems: "center",
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    overflow: "hidden",
    letterSpacing: 0.5,
    ...Platform.select({
      ios: {
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonDisabled: {
    backgroundColor: "#2A2A2C",
    opacity: 0.8,
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  paginationDotActive: {
    backgroundColor: "#007AFF",
    width: 24,
  },
});
