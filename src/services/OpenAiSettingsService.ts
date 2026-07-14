import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PROVIDER_URL = '@callmind/task_provider_url';
const KEY_API_KEY = '@callmind/task_api_key';
const KEY_MODEL_NAME = '@callmind/task_model_name';

export interface OpenAiSettings {
  providerUrl: string;
  apiKey: string;
  modelName: string;
}

export const getOpenAiSettings = async (): Promise<OpenAiSettings> => {
  const providerUrl = await AsyncStorage.getItem(KEY_PROVIDER_URL) || 'https://api.openai.com/v1';
  const apiKey = await AsyncStorage.getItem(KEY_API_KEY) || '';
  const modelName = await AsyncStorage.getItem(KEY_MODEL_NAME) || 'gpt-4o-mini';
  
  return { providerUrl, apiKey, modelName };
};

export const saveOpenAiSettings = async (settings: OpenAiSettings): Promise<void> => {
  await AsyncStorage.setItem(KEY_PROVIDER_URL, settings.providerUrl.trim());
  await AsyncStorage.setItem(KEY_API_KEY, settings.apiKey.trim());
  await AsyncStorage.setItem(KEY_MODEL_NAME, settings.modelName.trim());
};
