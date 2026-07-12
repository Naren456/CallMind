// @ts-nocheck
import { FFmpegKit, ReturnCode } from 'ffmpeg-expo';
import * as FileSystem from 'expo-file-system';

export interface ConversionResult {
  success: boolean;
  outputPath: string | null;
  error?: string;
}

export const prepareCallFileForWhisper = async (inputUri: string): Promise<ConversionResult> => {
  try {
    const filename = `normalized_call_${Date.now()}.wav`;
    const outputPath = `${FileSystem.cacheDirectory}${filename}`;

    const ffmpegArgs = [
      '-y',
      '-i', inputUri,
      '-ac', '1',
      '-ar', '16000',
      outputPath
    ];

    // Executes native transcode cleanly
    await FFmpegKit.execute(ffmpegArgs);

    return { success: true, outputPath };
  } catch (err: any) {
    console.error('[AudioConverter] Encoding operation failed:', err);
    return {
      success: false,
      outputPath: null,
      error: err instanceof Error ? err.message : String(err)
    };
  }
};