import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { IconSymbol } from "./ui/IconSymbol";

type Props = {
  onComplete: () => void;
};

const slides = [
  {
    title: "Willkommen bei PicSwipe",
    description:
      "Behalte den Überblick über deine Fotos und räume ganz einfach auf.",
    icon: "photo.stack",
  },
  {
    title: "Fotos durchsehen",
    description:
      "Swipe nach links um ein Foto zu löschen, nach rechts um es zu behalten.",
    icon: "hand.draw",
  },
  {
    title: "Monat für Monat",
    description:
      "Arbeite dich Monat für Monat durch deine Fotos und behalte nur die besten.",
    icon: "calendar",
  },
];

export function Onboarding({ onComplete }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    icon: {
      marginBottom: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 16,
      color: colors.text,
    },
    description: {
      fontSize: 16,
      textAlign: "center",
      color: colors.secondary,
      marginBottom: 40,
    },
    dots: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 40,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.secondary,
      opacity: 0.3,
    },
    activeDot: {
      opacity: 1,
      backgroundColor: colors.primary,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      marginBottom: 20,
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    skipButton: {
      padding: 16,
    },
    skipText: {
      color: colors.secondary,
      fontSize: 16,
    },
  });

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const currentSlideData = slides[currentSlide];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <IconSymbol
          name={currentSlideData.icon}
          size={64}
          color={colors.primary}
          style={styles.icon}
        />
        <Text style={styles.title}>{currentSlideData.title}</Text>
        <Text style={styles.description}>{currentSlideData.description}</Text>

        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentSlide && styles.activeDot]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentSlide === slides.length - 1 ? "Los geht's" : "Weiter"}
          </Text>
        </Pressable>

        {currentSlide < slides.length - 1 && (
          <Pressable style={styles.skipButton} onPress={onComplete}>
            <Text style={styles.skipText}>Überspringen</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
