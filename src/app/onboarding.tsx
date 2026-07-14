// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { requestDirectoryAccess, setHasOnboarded, getBrandInstructions } from '../services/StorageService';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = 3;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [folderUri, setFolderUri] = useState<string | null>(null);




  const handleNext = () => {
    if (step < ONBOARDING_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handleSelectFolder = async () => {
    const uri = await requestDirectoryAccess();
    if (uri) {
      setFolderUri(uri);
      handleNext();
    }
  };



  const handleComplete = async () => {
    await setHasOnboarded(true);
    router.replace('/(tabs)/home');
  };



  return (
    <View style={styles.container}>
      {/* Progress Dots */}
      <View style={styles.dotContainer}>
        {[...Array(ONBOARDING_STEPS)].map((_, i) => (
          <View key={i} style={[styles.dot, step === i && styles.activeDot]} />
        ))}
      </View>

      <View style={styles.content}>
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Welcome to CallMind</Text>
            <Text style={styles.description}>
              Your completely offline, highly secure AI assistant that turns your phone conversations into actionable tasks.
            </Text>
            <View style={styles.featureBox}>
              <View style={styles.featureRow}>
                <Ionicons name="lock-closed" size={20} color="#2563eb" />
                <Text style={styles.featureText}>100% Offline Processing</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="mic" size={20} color="#2563eb" />
                <Text style={styles.featureText}>Advanced Speech-to-Text</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="sparkles" size={20} color="#2563eb" />
                <Text style={styles.featureText}>Automatic Task Extraction</Text>
              </View>
            </View>
            <Pressable style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Get Started</Text>
            </Pressable>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Locate Recordings</Text>
            <Text style={styles.description}>
              CallMind needs to know where your phone saves call recordings to process them automatically.
            </Text>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>{getBrandInstructions()}</Text>
            </View>
            <Pressable style={styles.button} onPress={handleSelectFolder}>
              <Text style={styles.buttonText}>Select Folder</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleNext}>
              <Text style={styles.secondaryButtonText}>Skip for now</Text>
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.description}>
              CallMind is ready to organize your life, directly from your calls. 
            </Text>
            
            <View style={styles.featureBox}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.featureText}>Directory Access Configured</Text>
              </View>
            </View>

            <Pressable style={[styles.button, { marginTop: 40 }]} onPress={handleComplete}>
              <Text style={styles.buttonText}>Launch CallMind</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Light background
    paddingTop: 60,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#2563eb', // Blue accent matching home.tsx
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  featureBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  instructionBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  instructionText: {
    fontSize: 15,
    color: '#1d4ed8',
    lineHeight: 22,
    textAlign: 'center',
  },
  modelBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  modelDesc: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  downloadButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#1f2937',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  progressText: {
    position: 'absolute',
    right: 8,
    top: -2,
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  successText: {
    color: '#10b981',
    fontWeight: '600',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
