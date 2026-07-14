// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initializeDatabase } from '../database/DbService';

export default function RootLayout() {
  const [isDatabaseReady, setIsDatabaseReady] = useState<boolean>(false);

  useEffect(() => {
    async function bootStorageCore() {
      try {
        await initializeDatabase();
        setIsDatabaseReady(true);
      } catch (e) {
        console.error('[RootLayout] Application boot trapped by database halt:', e);
      }
    }
    bootStorageCore();
  }, []);

  // Show a clean, minimalist system loader while database tables initialize
  if (!isDatabaseReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}