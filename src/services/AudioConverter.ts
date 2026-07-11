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

    console.log(`[AudioConverter] Normalizing stream: ${inputUri}`);
    
    /**
     * Arguments for 2019 CPUs:
     * -y        Overwrites cache files safely if they collide
     * -ac 1     Downmixes multi-channel telephone audio to a single channel
     * -ar 16000 Hard caps sample-rate frequency to 16,000Hz (Whisper strict limit)
     */
    const ffmpegCommand = `-y -i "${inputUri}" -ac 1 -ar 16000 "${outputPath}"`;

    const session = await FFmpegKit.execute(ffmpegCommand);
    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log(`[AudioConverter] Transcode operation successful: ${outputPath}`);
      return { success: true, outputPath };
    } else {
      const logs = await session.getLogs();
      const failureReason = logs.map(l => l.getMessage()).join('\n');
      return { success: false, outputPath: null, error: failureReason };
    }
  } catch (err: any) {
    console.error('[AudioConverter] Execution runtime threw exception:', err);
    return { success: false, outputPath: null, error: err.message };
  }
};