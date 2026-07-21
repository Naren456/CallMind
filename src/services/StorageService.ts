import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as DocumentPicker from "expo-document-picker";

export const STORAGE_KEYS = {
  FOLDER_URI: "@callmind_recordings_folder_uri",
  MANUAL_MODE: "@callmind_is_manual_mode",
  HAS_ONBOARDED: "@callmind_has_onboarded",
  TRANSCRIPTION_MODE: "@callmind_transcription_mode",
  CLOUD_ENABLED: "@callmind_cloud_enabled",
};

export type TranscriptionMode = "local" | "cloud";

export const getTranscriptionMode = async (): Promise<TranscriptionMode> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.TRANSCRIPTION_MODE);
    return value === "cloud" ? "cloud" : "local";
  } catch (e) {
    return "local";
  }
};

export const setTranscriptionMode = async (
  mode: TranscriptionMode,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSCRIPTION_MODE, mode);
  } catch (e) {
    console.error("[StorageService] Failed to save transcription mode:", e);
  }
};

export const getCloudEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.CLOUD_ENABLED);
    return value !== "false";
  } catch (e) {
    return true;
  }
};

export const setCloudEnabled = async (value: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CLOUD_ENABLED, value.toString());
  } catch (e) {
    console.error("[StorageService] Failed to save cloud enabled:", e);
  }
};

export const checkHasOnboarded = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED);
    return value === "true";
  } catch (e) {
    return false;
  }
};

export const setHasOnboarded = async (value: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, value.toString());
  } catch (e) {
    console.error("[StorageService] Failed to save onboarding state:", e);
  }
};

export const getBrandInstructions = (): string => {
  const brand = (Device.brand || "").toLowerCase();
  if (brand.includes("samsung")) {
    return 'Select the "Recordings/Call" folder inside your internal storage root.';
  }
  if (
    brand.includes("xiaomi") ||
    brand.includes("redmi") ||
    brand.includes("poco")
  ) {
    return 'Select the "MIUI/sound_recorder/call_rec" directory.';
  }
  if (
    brand.includes("oneplus") ||
    brand.includes("oppo") ||
    brand.includes("realme")
  ) {
    return 'Select the "Music/Recordings/Call Recordings" directory.';
  }
  return "Select the default system folder where your Phone dialer app saves recorded call audio tracks.";
};

import * as FileSystem from "expo-file-system/legacy";

export const requestDirectoryAccess = async (): Promise<string | null> => {
  try {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (permissions.granted) {
      const selectedUri = permissions.directoryUri;
      await AsyncStorage.setItem(STORAGE_KEYS.FOLDER_URI, selectedUri);
      await AsyncStorage.setItem(STORAGE_KEYS.MANUAL_MODE, "false");
      return selectedUri;
    }
  } catch (error) {
    console.error("[StorageService] Directory handshake dropped:", error);
  }
  return null;
};

export const importSingleCallLog = async (): Promise<string | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true, // Crucial for letting FFmpeg read the file out of the sandbox cache
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }
  } catch (error) {
    console.error(
      "[StorageService] Manual audio asset extraction failed:",
      error,
    );
  }
  return null;
};

export const getFolderUri = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.FOLDER_URI);
  } catch (e) {
    return null;
  }
};

export interface AudioFile {
  uri: string;
  name: string;
  parsedDate?: string | null;
  parsedTime?: string | null;
  phoneNumber?: string | null;
}

import {
    getAllCachedAudioFilesList,
    getCachedAudioFiles,
    removeDeletedAudioFiles
} from "../database/TaskRepository";
import { parseMetadataFromFilename } from "../utils/fileUtils";

export const getAudioFilesFromCache = async (): Promise<AudioFile[]> => {
  return await getAllCachedAudioFilesList();
};

export const syncAudioFilesWithStorage = async (
  folderUri: string,
): Promise<AudioFile[]> => {
  try {
    const files =
      await FileSystem.StorageAccessFramework.readDirectoryAsync(folderUri);
    const audioExtensions = [
      ".m4a",
      ".mp3",
      ".wav",
      ".aac",
      ".amr",
      ".ogg",
      ".flac",
      ".awb",
    ];

    // Filter out non-audio files
    const validFileUris: string[] = [];
    const filesToProcess: string[] = [];

    for (const fileUri of files) {
      const lowerUri = fileUri.toLowerCase();
      if (audioExtensions.some((ext) => lowerUri.endsWith(ext))) {
        validFileUris.push(fileUri);
        filesToProcess.push(fileUri);
      }
    }

    // Clean up deleted files from cache
    await removeDeletedAudioFiles(validFileUris);

    // Fetch current cache map
    const cacheMap = await getCachedAudioFiles();
    const isInitialSetup = Object.keys(cacheMap).length === 0;

    // Process only new files
    const newFilesToInsert = [];
    const discoveredNewFiles: AudioFile[] = [];

    for (const fileUri of filesToProcess) {
      if (!cacheMap[fileUri]) {
        const decodedUri = decodeURIComponent(fileUri);
        const parts = decodedUri.split("/");
        const name = parts[parts.length - 1];

        const metadata = parseMetadataFromFilename(name);
        const newFile = {
          uri: fileUri,
          name,
          parsedDate: metadata.parsedDate,
          parsedTime: metadata.parsedTime,
          phoneNumber: metadata.phoneNumber,
        };
        newFilesToInsert.push(newFile);

        // If this is NOT the initial setup, we track it as a new file to auto-process
        if (!isInitialSetup) {
          discoveredNewFiles.push(newFile);
        }
      }
    }

    // Batch insert for massive speedup
    if (newFilesToInsert.length > 0) {
      const {
        upsertCachedAudioFilesBatch,
      } = require("../database/TaskRepository");
      await upsertCachedAudioFilesBatch(newFilesToInsert);
    }

    return discoveredNewFiles;
  } catch (error) {
    console.error("[StorageService] Failed to sync audio files:", error);
    return [];
  }
};
