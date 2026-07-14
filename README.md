<p align="center">
  <img src="./logo.png" width="120" alt="CallMind Logo" />
  <br />
  <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React Native"></a>
  <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-1B1F23?style=flat&logo=expo&logoColor=white" alt="Expo"></a>
  <a href="https://sqlite.org/"><img src="https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white" alt="SQLite"></a>
</p>

# CallMind

CallMind is an intelligent React Native mobile application built with Expo that transforms your raw call recordings into organized, actionable tasks. It seamlessly syncs with your device's call recording folders, provides a clean interface to manage and play back recordings, and uses AI to transcribe conversations and extract pending action items.

## Features

- **Smart Audio Syncing**: Automatically reads and caches call recordings from your device using a high-performance, batch-processing SQLite background engine.
- **Advanced Metadata Extraction**: Intelligently parses filenames to extract accurate dates, times, and phone numbers/contact names.
- **Integrated Audio Player**: Features a built-in, smooth audio player with real-time progress tracking optimized for 60FPS scrolling performance.
- **AI-Powered Transcription**: Leverages Cloud Transcription Services to convert audio into highly accurate text transcripts.
- **Automated Task Extraction**: Connects to OpenAI-compatible APIs to automatically analyze call transcripts and extract priority-based action items.
- **Task Management Dashboard**: A dedicated Task List to view, track, and complete action items generated from your calls.

## Technology Stack

- **Framework**: React Native with Expo (v57) & Expo Router
- **State & Data**: React Hooks, SQLite (`expo-sqlite`) for robust on-device caching
- **UI & Styling**: React Native stylesheets, `@shopify/flash-list` for performant lists, `@expo/vector-icons`
- **Audio Processing**: `expo-audio` for playback, `expo-file-system` and `expo-document-picker` for file management
- **AI Integrations**: `openai` Node SDK for task extraction, Custom Cloud APIs for STT (Speech-to-Text)

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI
- An Android Emulator or physical device (Android is optimized for the local file system access).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/callmind.git
   cd callmind
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Press `a` in the terminal to open the app on your connected Android device or emulator.

## Configuration

To enable the AI capabilities, you will need to configure your API keys within the app:
1. Open the app and navigate to the **Settings** tab.
2. Enter your OpenAI-compatible API Provider URL and API Key for task extraction.
3. Configure your preferred transcription service details as required by the environment.

## Project Structure

- `src/app/` - Expo Router navigation, containing tabs (`home`, `history`, `settings`) and the onboarding flow.
- `src/components/` - Reusable UI components like the `AudioCard` and playback controls.
- `src/database/` - SQLite schema definitions, DbService, and the `TaskRepository` for local caching and batch operations.
- `src/services/` - Core business logic engines (`StorageService`, `AiEngine`, `CloudTranscriptionService`).
- `src/utils/` - Helper functions like `fileUtils` for complex date and metadata parsing.

## Privacy & Security

CallMind processes your files securely. While audio files are temporarily processed via configured third-party transcription services to generate text, your task data and metadata caches are stored strictly locally on your device's SQLite database.