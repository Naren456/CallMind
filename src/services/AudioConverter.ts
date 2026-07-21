import { execute, FFmpegError } from 'ffmpeg-expo';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

export interface ConversionResult {
  success: boolean;
  outputPath: string | null;
  error?: string;
}

export const prepareCallFileForWhisper = async (inputUri: string): Promise<ConversionResult> => {
  let tempInputPath: string | null = null;
  
  try {
    const filename = `normalized_call_${Date.now()}.wav`;
    const outputUri = `${FileSystem.cacheDirectory}${filename}`;
    
    let ffmpegInputUri = inputUri;

    // FFmpeg generally struggles with Android 'content://' SAF URIs.
    // We copy the file to the local cache directory first to ensure FFmpeg can read it.
    if (inputUri.startsWith('content://')) {
      tempInputPath = `${FileSystem.cacheDirectory}temp_input_${Date.now()}.m4a`;
      await FileSystem.copyAsync({
        from: inputUri,
        to: tempInputPath
      });
      ffmpegInputUri = tempInputPath;
    }

    // Strip 'file://' prefix as FFmpeg native binaries expect absolute paths, not URIs
    const inputPath = ffmpegInputUri.replace(/^file:\/\//, '');
    const outputPath = outputUri.replace(/^file:\/\//, '');

    const ffmpegArgs = [
      '-y',
      '-i', inputPath,
      '-f', 'wav',          // Explicitly set output container to WAV
      '-acodec', 'pcm_s16le', // 16-bit signed little-endian PCM — audioFormat=1
      '-ar', '16000',        // 16kHz required by whisper.cpp
      '-ac', '1',            // Mono channel
      outputPath
    ];

    await execute(ffmpegArgs);

    // ── Diagnostic: verify output exists and read WAV audioFormat field ──────
    const outInfo = await FileSystem.getInfoAsync(outputUri);
    if (!outInfo.exists) {
      throw new Error('FFmpeg ran but output WAV file was not created.');
    }
    console.log(`[AudioConverter] Output WAV size: ${(outInfo as any).size} bytes`);

    // Read first 24 bytes to inspect the fmt chunk audioFormat field (bytes 20-21)
    const headerB64 = await FileSystem.readAsStringAsync(outputUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 24,
      position: 0,
    });
    const headerBytes = Uint8Array.from(Buffer.from(headerB64, 'base64'));
    const audioFormat = headerBytes[20]! | (headerBytes[21]! << 8);
    console.log(`[AudioConverter] WAV audioFormat field = ${audioFormat} (1=PCM, 3=IEEE_FLOAT, 6=ALAW, 7=ULAW)`);
    // ────────────────────────────────────────────────────────────────────────

    // Clean up temporary input file
    if (tempInputPath) {
      await FileSystem.deleteAsync(tempInputPath, { idempotent: true }).catch(() => {});
    }

    return { success: true, outputPath: outputUri };
  } catch (err: any) {
    console.error('[AudioConverter] Encoding operation failed:', err);
    
    if (tempInputPath) {
      await FileSystem.deleteAsync(tempInputPath, { idempotent: true }).catch(() => {});
    }

    let errorMessage = err instanceof Error ? err.message : String(err);
    
    // Explicitly handle FFmpegError which contains the exact failure output
    if (err && typeof err === 'object' && 'output' in err) {
      errorMessage = `FFmpeg failed: ${(err as any).output || 'Unknown error (no output)'}`;
    }

    return {
      success: false,
      outputPath: null,
      error: errorMessage
    };
  }
};

