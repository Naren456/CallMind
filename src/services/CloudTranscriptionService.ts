import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com';
const KEY_API_KEY     = '@callmind/assemblyai_key';

// ─── Preference helpers ────────────────────────────────────────────────────

export const getAssemblyAiKey = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEY_API_KEY);
};

export const setAssemblyAiKey = async (key: string): Promise<void> => {
  await AsyncStorage.setItem(KEY_API_KEY, key.trim());
};

export const clearAssemblyAiKey = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY_API_KEY);
};

// ─── AssemblyAI REST helpers ───────────────────────────────────────────────

/**
 * Step 1 — Upload the raw audio bytes to AssemblyAI's CDN.
 * Returns a temporary `upload_url` that can be referenced for transcription.
 */
const uploadAudio = async (fileUri: string, apiKey: string): Promise<string> => {
  console.log('[Cloud] Uploading audio to AssemblyAI…');

  // Read file as base64, convert to binary for fetch body
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Decode base64 → Uint8Array (works in React Native's Hermes engine)
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const response = await fetch(`${ASSEMBLYAI_BASE}/v2/upload`, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/octet-stream',
    },
    body: bytes,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AssemblyAI upload failed (${response.status}): ${err}`);
  }

  const { upload_url } = await response.json();
  console.log('[Cloud] Upload complete. URL:', upload_url);
  return upload_url;
};

/**
 * Step 2 — Request a transcription job from AssemblyAI.
 * Returns the transcript ID for polling.
 */
const requestTranscription = async (uploadUrl: string, apiKey: string): Promise<string> => {
  console.log('[Cloud] Requesting transcription job…');

  const response = await fetch(`${ASSEMBLYAI_BASE}/v2/transcript`, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      language_detection: true,   // auto-detect Hindi / English / Hinglish
      punctuate: true,
      format_text: true,
      speaker_labels: true,       // enable speaker diarization
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AssemblyAI transcription request failed (${response.status}): ${err}`);
  }

  const { id } = await response.json();
  console.log('[Cloud] Transcription job created. ID:', id);
  return id;
};

/**
 * Step 3 — Poll until the transcript is ready (status = "completed").
 */
const pollTranscript = async (
  transcriptId: string,
  apiKey: string,
  onProgress?: (status: string) => void,
): Promise<string> => {
  const url = `${ASSEMBLYAI_BASE}/v2/transcript/${transcriptId}`;

  for (let attempt = 0; attempt < 120; attempt++) {
    // Poll every 3 seconds, up to 6 minutes total
    await new Promise(r => setTimeout(r, 3000));

    const response = await fetch(url, {
      headers: { authorization: apiKey },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AssemblyAI poll failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    console.log(`[Cloud] Poll ${attempt + 1}: status=${data.status}`);
    onProgress?.(data.status);

    if (data.status === 'completed') {
      if (data.utterances && data.utterances.length > 0) {
        // Format with speaker labels (e.g., "Speaker A: Hello")
        const formatted = data.utterances
          .map((u: any) => `Speaker ${u.speaker}: ${u.text}`)
          .join('\n');
        return formatted;
      }
      return (data.text ?? '').trim();
    }

    if (data.status === 'error') {
      throw new Error(`AssemblyAI transcription error: ${data.error}`);
    }
  }

  throw new Error('AssemblyAI transcription timed out after 6 minutes.');
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Full cloud transcription pipeline:
 * Upload → Request → Poll → Return transcript text.
 *
 * Accepts any audio format (M4A, MP3, WAV, etc.) — no FFmpeg required.
 */
export const transcribeWithAssemblyAI = async (
  fileUri: string,
  onProgress?: (status: string) => void,
): Promise<string> => {
  const apiKey = await getAssemblyAiKey();
  if (!apiKey) throw new Error('AssemblyAI API key is not configured. Please add it in Settings.');

  const uploadUrl = await uploadAudio(fileUri, apiKey);
  const transcriptId = await requestTranscription(uploadUrl, apiKey);
  const transcript = await pollTranscript(transcriptId, apiKey, onProgress);

  console.log('[Cloud] ✅ AssemblyAI transcript:\n', transcript);
  return transcript;
};
