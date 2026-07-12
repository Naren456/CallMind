// @ts-nocheck
import * as FileSystem from 'expo-file-system';

const MODELS = {
  WHISPER: {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    filename: 'ggml-base.bin'
  },
  GEMMA: {
    url: 'https://huggingface.co/lmstudio-community/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf',
    filename: 'gemma-3-1b-it-q4_k_m.gguf'
  }
};

export const getLocalModelPath = (type: 'WHISPER' | 'GEMMA' | 'LLAMA'): string => {
  const key = type === 'WHISPER' ? 'WHISPER' : 'GEMMA';
  return `${FileSystem.documentDirectory}${MODELS[key].filename}`;
};

export const checkModelsInstalled = async (): Promise<{ whisper: boolean; gemma: boolean }> => {
  try {
    const whisperPath = getLocalModelPath('WHISPER');
    const gemmaPath = getLocalModelPath('GEMMA');

    const whisperInfo = await FileSystem.getInfoAsync(whisperPath);
    const gemmaInfo = await FileSystem.getInfoAsync(gemmaPath);

    return {
      whisper: whisperInfo.exists && whisperInfo.size > 0,
      gemma: gemmaInfo.exists && gemmaInfo.size > 0,
    };
  } catch (error) {
    console.error('[ModelManager] Verification checks threw an error:', error);
    return { whisper: false, gemma: false };
  }
};

export const downloadModelFile = (
  type: 'WHISPER' | 'GEMMA' | 'LLAMA',
  onProgress: (progress: number) => void
): { downloadResumable: FileSystem.DownloadResumable; promise: Promise<string> } => {
  const key = type === 'WHISPER' ? 'WHISPER' : 'GEMMA';
  const targetPath = getLocalModelPath(key);
  const sourceUrl = MODELS[key].url;

  const callback = (downloadProgress: any) => {
    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
    onProgress(Math.min(isNaN(progress) ? 0 : progress, 1));
  };

  const downloadResumable = FileSystem.createDownloadResumable(
    sourceUrl,
    targetPath,
    {},
    callback
  );

  const promise = downloadResumable.downloadAsync().then((result) => {
    if (!result || !result.uri) {
      throw new Error(`[ModelManager] Download stream failed for: ${type}`);
    }
    return result.uri;
  });

  return { downloadResumable, promise };
};
