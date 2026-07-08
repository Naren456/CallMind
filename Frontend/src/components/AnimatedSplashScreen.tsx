import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import CallMindLogo from './CallMindLogo';

// Prevent the native splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function AnimatedSplashScreen({ children }: { children: React.ReactNode }) {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts or other required assets here
      } catch (e) {
        console.warn(e);
      } finally {
        setIsAppReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = async () => {
    if (isAppReady) {
      // Hide the native splash screen now that our React component is mounted
      await SplashScreen.hideAsync();
      
      // Let the custom logo animation play for 2.5 seconds
      setTimeout(() => {
        setIsSplashAnimationComplete(true);
      }, 2500);
    }
  };

  if (!isAppReady) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      {!isSplashAnimationComplete && (
        <Animated.View
          exiting={FadeOut.duration(800)}
          style={[StyleSheet.absoluteFill, styles.splashContainer]}
        >
          <CallMindLogo size={180} color="#FF7F50" />
        </Animated.View>
      )}
      
      {/* We render the main app behind the splash screen so it's ready when splash fades out */}
      <View style={StyleSheet.absoluteFill}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Premium deep indigo background
  },
  splashContainer: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999, // Ensure it stays on top of the children
  }
});
