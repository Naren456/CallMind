import * as FileSystem from "expo-file-system/legacy";
import { initWhisper } from "whisper.rn";
import { transcribeWithAssemblyAI } from "./CloudTranscriptionService";
import { prepareCallFileForWhisper } from "./AudioConverter";
import { getCloudEnabled } from "./StorageService";

// Multilingual Whisper Base model (~142MB) — good accuracy for Hindi/Hinglish/English
// Upgrade path: ggml-tiny (~75MB) < ggml-base (~142MB) < ggml-small (~466MB)
const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";
const MODEL_FILENAME = "ggml-base.bin";

export class LocalTranscriptionService {
  private whisperContext: any = null;

  /**
   * Initializes the Whisper context. Downloads the model if it doesn't exist locally.
   */
  async init(): Promise<void> {
    if (this.whisperContext) return;

    const modelPath = `${FileSystem.documentDirectory}${MODEL_FILENAME}`;
    const fileInfo = await FileSystem.getInfoAsync(modelPath);

    if (!fileInfo.exists) {
      console.log(
        `[LocalTranscription] Model not found locally. Downloading from ${MODEL_URL}...`,
      );
      const { uri } = await FileSystem.downloadAsync(MODEL_URL, modelPath);
      console.log(`[LocalTranscription] Downloaded model to ${uri}`);
    } else {
      console.log(`[LocalTranscription] Model found at ${modelPath}`);
    }

    console.log("[LocalTranscription] Initializing Whisper context...");
    this.whisperContext = await initWhisper({
      filePath: modelPath,
    });
    console.log("[LocalTranscription] Whisper context initialized.");
  }

  /**
   * Transcribes 16-bit PCM samples passed as an ArrayBuffer.
   * Uses transcribeData() which bypasses WAV header validation entirely.
   */
  async transcribeLocally(pcmArrayBuffer: ArrayBuffer): Promise<string> {
    await this.init();

    console.log(
      `[LocalTranscription] Starting local transcription (${pcmArrayBuffer.byteLength} bytes of PCM)...`,
    );
    // Parameters match whisper.cpp CLI defaults for parity with Termux results
    const options = {
      language: "en",
      translate: false,
      beamSize: 5,    // whisper.cpp default
      bestOf: 5,      // whisper.cpp default
      temperature: 0, // deterministic, no random sampling
    };
    const { promise } = this.whisperContext.transcribeData(pcmArrayBuffer, options);


    const { result } = await promise;
    console.log("[LocalTranscription] Local transcription complete.");
    return result.trim();
  }

  /**
   * Hybrid approach: Attempts local transcription first, falls back to cloud transcription on failure.
   * @param fileUri The URI of the audio file to transcribe.
   */
  async transcribe(
    fileUri: string,
    onProgress?: (status: string) => void,
    mode: "local" | "cloud" = "local",
  ): Promise<string> {
    const cloudEnabled = await getCloudEnabled();

    if (mode === "cloud") {
      if (!cloudEnabled) {
        throw new Error("Cloud transcription is disabled in settings.");
      }
      onProgress?.("Using cloud transcription");
      return await transcribeWithAssemblyAI(fileUri, onProgress);
    }

    try {
      console.log(
        "[LocalTranscription] Attempting local transcription via whisper.rn...",
      );
      
      onProgress?.("Converting audio for local processing...");
      const conversionResult = await prepareCallFileForWhisper(fileUri);

      if (!conversionResult.success || !conversionResult.pcmArrayBuffer) {
        throw new Error(`Failed to convert audio: ${conversionResult.error}`);
      }

      onProgress?.("Attempting local transcription");
      const text = await this.transcribeLocally(conversionResult.pcmArrayBuffer);

      if (!text || text.length === 0) {
        throw new Error("Local transcription returned empty result.");
      }
      return text;
    } catch (localError: any) {
      console.warn(
        `[LocalTranscription] Local transcription failed: ${localError.message}. Falling back to Cloud Transcription...`,
      );
      if (!cloudEnabled) {
        throw new Error(
          `Local transcription failed: ${localError.message}. Cloud fallback is disabled.`,
        );
      }
      onProgress?.("Local failed, falling back to cloud");

      try {
        const text = await transcribeWithAssemblyAI(fileUri, onProgress);
        return text;
      } catch (cloudError: any) {
        console.error(
          `[LocalTranscription] Cloud transcription also failed: ${cloudError.message}`,
        );
        throw new Error(
          `Transcription failed completely. Local error: ${localError.message} | Cloud error: ${cloudError.message}`,
        );
      }
    }
  }
}

export const localTranscriptionService = new LocalTranscriptionService();
