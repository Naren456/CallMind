// @ts-nocheck
import { useEffect, useState, useCallback } from "react";
import {
  Pressable, StyleSheet, Text, View,
  ScrollView, TextInput, Switch,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { aiEngine } from "../../services/AiEngine";
import {
  getAssemblyAiKey,
  setAssemblyAiKey,
  clearAssemblyAiKey,
} from "../../services/CloudTranscriptionService";
import { getOpenAiSettings, saveOpenAiSettings } from "../../services/OpenAiSettingsService";

const Settings = () => {
  // Cloud settings
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // OpenAI Provider settings
  const [providerUrl, setProviderUrl] = useState('');
  const [taskApiKey, setTaskApiKey] = useState('');
  const [savedTaskApiKey, setSavedTaskApiKey] = useState<string | null>(null);
  const [modelName, setModelName] = useState('');
  const [showTaskKey, setShowTaskKey] = useState(false);
  const [isSavingTaskSettings, setIsSavingTaskSettings] = useState(false);
  const [isLoadingSelection, setIsLoadingSelection] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      const [key, openaiSettings] = await Promise.all([
        getAssemblyAiKey(),
        getOpenAiSettings()
      ]);
      setSavedKey(key);
      setProviderUrl(openaiSettings.providerUrl);
      setTaskApiKey(openaiSettings.apiKey);
      setSavedTaskApiKey(openaiSettings.apiKey || null);
      setModelName(openaiSettings.modelName);
      setIsLoadingSelection(false);
    };
    void loadAll();
  }, []);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setIsSavingKey(true);
    await setAssemblyAiKey(apiKey.trim());
    setSavedKey(apiKey.trim());
    setApiKey('');
    setIsSavingKey(false);
  };

  const handleClearKey = async () => {
    await clearAssemblyAiKey();
    setSavedKey(null);
    setApiKey('');
  };

  const handleSaveTaskSettings = async () => {
    setIsSavingTaskSettings(true);
    await saveOpenAiSettings({ providerUrl, apiKey: taskApiKey, modelName });
    setSavedTaskApiKey(taskApiKey.trim() || null);
    setIsSavingTaskSettings(false);
  };



  const maskedKey = savedKey
    ? `sk-asm…${savedKey.slice(-6)}`
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Ionicons name="cloud" size={20} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>AssemblyAI Transcription</Text>
            <Text style={styles.cardSubtitle}>
              Fast and accurate cloud-based transcription.
            </Text>
          </View>
        </View>

        <View style={styles.apiKeySection}>
          <Text style={styles.apiKeyLabel}>
            API Key
            {'  '}
            <Text style={styles.apiKeyHint}>
              Get one free at assemblyai.com
            </Text>
          </Text>

          {savedKey ? (
            <View style={styles.savedKeyRow}>
              <View style={styles.savedKeyBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.savedKeyText}>
                  {showKey ? savedKey : maskedKey}
                </Text>
              </View>
              <Pressable onPress={() => setShowKey(v => !v)} style={styles.iconBtn}>
                <Ionicons
                  name={showKey ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#6b7280"
                />
              </Pressable>
              <Pressable onPress={handleClearKey} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.keyInputRow}>
              <TextInput
                style={styles.keyInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Paste your API key here…"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showKey}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowKey(v => !v)} style={styles.iconBtn}>
                <Ionicons
                  name={showKey ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#6b7280"
                />
              </Pressable>
              <Pressable
                onPress={handleSaveKey}
                style={[styles.saveBtn, !apiKey.trim() && styles.saveBtnDisabled]}
                disabled={!apiKey.trim() || isSavingKey}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={15} color="#7c3aed" />
            <Text style={styles.infoText}>
              Audio is uploaded to AssemblyAI for transcription (M4A sent directly — no conversion needed).
            </Text>
          </View>
        </View>
      </View>

      {/* ── Task extraction provider (OpenAI compatible) ───── */}
      <Text style={styles.sectionHeader}>Task Provider Settings</Text>
      <Text style={styles.sectionSubheader}>
        Configure any OpenAI-compatible provider (OpenAI, Groq, Together, etc.) for task extraction.
      </Text>
      <View style={[styles.card, { marginTop: 0 }]}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Provider Base URL</Text>
          <TextInput
            style={styles.textInput}
            value={providerUrl}
            onChangeText={setProviderUrl}
            placeholder="e.g. https://api.openai.com/v1"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>API Key</Text>
          <View style={styles.keyInputRow}>
            <TextInput
              style={styles.keyInput}
              value={taskApiKey}
              onChangeText={setTaskApiKey}
              placeholder="Your API Key"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showTaskKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowTaskKey(v => !v)} style={styles.iconBtn}>
              <Ionicons
                name={showTaskKey ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#6b7280"
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Model Name</Text>
          <TextInput
            style={styles.textInput}
            value={modelName}
            onChangeText={setModelName}
            placeholder="e.g. gpt-4o-mini"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={handleSaveTaskSettings}
          style={[styles.fullSaveBtn, isSavingTaskSettings && styles.saveBtnDisabled]}
          disabled={isSavingTaskSettings}
        >
          <Text style={styles.saveBtnText}>{isSavingTaskSettings ? "Saving..." : "Save Provider Settings"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: '#111827',
    marginBottom: 20,
  },

  // ── Cloud card ──────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  apiKeySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  apiKeyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  apiKeyHint: {
    fontWeight: '400',
    color: '#7c3aed',
  },
  savedKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  savedKeyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  savedKeyText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#15803d',
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    fontFamily: 'monospace',
  },
  iconBtn: {
    padding: 8,
  },
  saveBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnDisabled: {
    backgroundColor: '#c4b5fd',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  fullSaveBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#faf5ff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#5b21b6',
    lineHeight: 18,
  },


});