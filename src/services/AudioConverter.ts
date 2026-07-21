import { decodeAudioData } from 'react-native-audio-api';
import * as FileSystem from 'expo-file-system/legacy';

export interface ConversionResult {
  success: boolean;
  /** Float32 PCM ArrayBuffer (mono, 16kHz) ready for whisper.rn's transcribeData() */
  pcmArrayBuffer: ArrayBuffer | null;
  error?: string;
}

const SAMPLE_RATE = 16000;

/**
 * Converts any audio file (M4A, AAC, MP4, WAV, etc.) to raw Float32 PCM samples
 * at 16kHz mono, suitable for whisper.rn's transcribeData(ArrayBuffer) API.
 *
 * Uses react-native-audio-api's decodeAudioData() which uses the platform's native
 * audio decoder (FFmpeg on Android) — the same pathway as whisper.cpp in Termux.
 */
export const prepareCallFileForWhisper = async (
  inputUri: string,
): Promise<ConversionResult> => {
  let localUri = inputUri;
  let tempInputPath: string | null = null;

  try {
    // react-native-audio-api cannot read content:// SAF URIs — copy to local cache first
    if (inputUri.startsWith('content://')) {
      tempInputPath = `${FileSystem.cacheDirectory}temp_input_${Date.now()}.m4a`;
      await FileSystem.copyAsync({ from: inputUri, to: tempInputPath });
      localUri = tempInputPath;
    }

    console.log('[AudioConverter] Decoding audio via react-native-audio-api...');

    // decodeAudioData handles M4A/AAC/WAV internally (uses FFmpeg on Android)
    // Passing SAMPLE_RATE resamples to 16kHz automatically
    const audioBuffer = await decodeAudioData(localUri, SAMPLE_RATE);

    const duration = audioBuffer.duration;
    const channels = audioBuffer.numberOfChannels;
    console.log(`[AudioConverter] Decoded: ${duration.toFixed(1)}s, ${channels}ch, ${audioBuffer.sampleRate}Hz`);

    // Get mono channel data (Float32Array, samples in range -1.0 to 1.0)
    const float32Samples = audioBuffer.getChannelData(0);

    console.log(`[AudioConverter] PCM samples: ${float32Samples.length} (~${(float32Samples.length / SAMPLE_RATE).toFixed(1)}s)`);

    // whisper.rn transcribeData() accepts Float32 ArrayBuffer directly
    return { success: true, pcmArrayBuffer: float32Samples.buffer };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[AudioConverter] Decoding failed:', msg);
    return { success: false, pcmArrayBuffer: null, error: msg };
  } finally {
    if (tempInputPath) {
      await FileSystem.deleteAsync(tempInputPath, { idempotent: true }).catch(() => {});
    }
  }
};
