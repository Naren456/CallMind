// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
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
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}