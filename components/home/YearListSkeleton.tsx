import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from "@/components/ThemeProvider";

type Props = {
  count?: number;
};

export function YearListSkeleton({ count = 5 }: Props) {
  const { colors } = useTheme();
  const opacity = new Animated.Value(0.5);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    thumbnail: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 14,
      backgroundColor: colors.border,
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    yearPlaceholder: {
      height: 24,
      width: '40%',
      backgroundColor: colors.border,
      borderRadius: 4,
    },
    photoCountPlaceholder: {
      height: 16,
      width: '60%',
      backgroundColor: colors.border,
      borderRadius: 4,
      marginTop: 8,
    },
    chevron: {
      width: 24,
      height: 24,
      marginLeft: 12,
      backgroundColor: colors.border,
      borderRadius: 12,
    },
  });

  return (
    <>
      {Array(count).fill(0).map((_, index) => (
        <Animated.View key={index} style={[styles.container, { opacity }]}>
          <View style={styles.thumbnail} />
          <View style={styles.textContainer}>
            <View style={styles.yearPlaceholder} />
            <View style={styles.photoCountPlaceholder} />
          </View>
          <View style={styles.chevron} />
        </Animated.View>
      ))}
    </>
  );
}
