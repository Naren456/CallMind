import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BrainCircuit } from 'lucide-react-native';

interface CallMindLogoProps {
  size?: number;
  color?: string;
  showText?: boolean;
}

export default function CallMindLogo({ size = 100, color = '#FF7F50', showText = true }: CallMindLogoProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    // Breathing animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <BrainCircuit size={size} color={color} strokeWidth={1.5} />
      </Animated.View>
      {showText && (
        <Text style={[styles.text, { color }]}>CallMind</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    // Add a soft glow effect
    shadowColor: '#FF7F50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  text: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    // Optional shadow for text
    textShadowColor: 'rgba(255, 127, 80, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  }
});
