


import React from 'react';
import { StyleSheet } from 'react-native';
import { GlassView } from 'expo-glass-effect';

export default function TabBarBackground() {
  return (
    <GlassView
      style={StyleSheet.absoluteFill}
      glassEffectStyle="regular"
    />
  );
}
