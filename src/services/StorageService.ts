import  * as DocumentPicker from 'expo-document-picker';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';


export const STORAGE_KEYS = {
    FOLDER_URI : '@callmind_recordings_folder_uri',
    MANUAL_MODE : '@callmind_is_manual_mode',
}


export const getBrandInstructions = (): string => {
  const brand = (Device.brand || '').toLowerCase();
  if (brand.includes('samsung')) {
    return 'Select the "Recordings/Call" folder inside your internal storage root.';
  }
  if (brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco')) {
    return 'Select the "MIUI/sound_recorder/call_rec" directory.';
  }
  if (brand.includes('oneplus') || brand.includes('oppo') || brand.includes('realme')) {
    return 'Select the "Music/Recordings/Call Recordings" directory.';
  }
  return 'Select the default system folder where your Phone dialer app saves recorded call audio tracks.';
};


export const requestDirectoryAccess = async (): Promise<string | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: false
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const selectedUri = result.assets[0].uri;
      await AsyncStorage.setItem(STORAGE_KEYS.FOLDER_URI, selectedUri);
      await AsyncStorage.setItem(STORAGE_KEYS.MANUAL_MODE, 'false');
      return selectedUri;
    }
  } catch (error) {
    console.error('[StorageService] Directory handshake dropped:', error);
  }
  return null;
};

export const importSingleCallLog = async (): Promise<string | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true // Crucial for letting FFmpeg read the file out of the sandbox cache
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }
  } catch (error) {
    console.error('[StorageService] Manual audio asset extraction failed:', error);
  }
  return null;
};