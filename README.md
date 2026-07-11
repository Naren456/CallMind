**CallMind** — Your Offline, Privacy-First Call Assistant 📞🧠

CallMind is a privacy-first, 100% offline on-device AI assistant tailored for the Indian market. It scans or imports local call recording files, downmixes and transcribes them, and extracts actionable tasks and strict deadlines — even from Hinglish (Hindi+English) code-switched speech — using local, quantized models running natively on-device.

> Privacy-first: No audio or text ever leaves your device — zero telemetry, zero cloud dependencies.

**Key Value Propositions**

- **Privacy**: All audio processing, ASR, and language-model inference happen on-device with no network calls.
- **Hinglish-aware**: Robust handling of code-switched Hindi/English, including local-relative time expressions (e.g., "kal", "parso", "aaj shaam", "coming Monday") converted to strict `YYYY-MM-DD` deadlines using device anchor time.
- **Offline-first**: Works without network connectivity — designed for markets with intermittent connectivity.
- **Zero-telemetry**: No analytics, crash reporting, or model telemetry by default.

**High-level Workflow**

Audio -> FFmpeg -> Whisper JSI (ASR) -> Llama JSI (Tasks & Deadlines) -> SQLite -> UI

- User selects or app scans local call recordings (SAF on Android).
- `ffmpeg-expo` normalizes audio to 16 kHz mono WAV (Whisper-compliant).
- `whisper.rn` (wrapping `whisper.cpp`) runs local ASR via JSI with quantized `ggml-base.bin` models.
- `llama.rn` (wrapping `llama.cpp`) runs a quantized SLM (`SmolLM3-1.7B-Q4_K_M.gguf` or Llama-3.2-3B) via JSI to extract tasks and normalize deadlines.
- Results stored in `expo-sqlite` database configured for WAL and indexed deadline columns.

**Core Architecture & Technical Notes**

- **Framework**: Built with Expo SDK using prebuild / development builds (Continuous Native Generation). Note: `Expo Go` WILL NOT work because CallMind depends on low-level native C++ runtimes and custom native modules.
- **Bridge & Runtime**: We bypass the legacy React Native bridge and use modern C++ JSI runtimes to load models directly into process memory and GPU/NE accelerators (Apple Neural Engine, Android NNAPI/OpenCL) when available.
- **Audio Processing**: `ffmpeg-expo` converts `.mp3`, `.m4a`, `.amr` and other vendor-specific formats into strict 16 kHz mono WAV for Whisper.
- **Local ASR**: `whisper.rn` (wraps `whisper.cpp`) loads a quantized `ggml-base.bin` (~140 MB) to transcribe call audio.
- **Local SLM**: `llama.rn` (wraps `llama.cpp`) runs a quantized `SmolLM3-1.7B-Q4_K_M.gguf` (~1.2 GB) or a Llama-3.2-3B variant for task extraction and deadline normalization.
- **Local DB**: `expo-sqlite` configured with Write-Ahead Logging (WAL) and indexes on ISO-8601 deadline columns for fast queries and reactive UI updates.
- **Onboarding & Storage**: On Android we use the Storage Access Framework (SAF) folder-picker loop to obtain persistent access to vendor-specific dialer recording folders (Samsung, Xiaomi, OnePlus, etc.) and to minimize permission friction.

**Modular Project Layout**

- **App entry & UI**: [src/app](src/app)
- **Database & models**: [src/database](src/database)
- **Audio services (FFmpeg, converters)**: [src/services/audio](src/services/audio)
- **ASR service (Whisper JSI wrapper)**: [src/services/asr](src/services/asr)
- **SLM service (Llama JSI wrapper)**: [src/services/slm](src/services/slm)
- **Hooks & state**: [src/hooks](src/hooks)
- **Components**: [src/components](src/components)
- **Onboarding & storage adapters**: [src/services/storage](src/services/storage)
- **Utilities & helpers**: [src/utils](src/utils)

**Installation & Quickstart**

Prerequisites:

- Node >= 18
- `npm` or `yarn`
- `expo-cli` (for managed commands) — install globally if desired
- Android or iOS native build toolchains configured (we use prebuild / dev builds)

1. Install dependencies

```bash
npm install
# or
yarn
```

2. Configure Metro to accept model/weight extensions (e.g., `.bin`, `.gguf`) and large binary asset sizes.

Example `metro.config.js` snippet to merge extensions:

```js
const { getDefaultConfig } = require("expo/metro-config");
const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.assetExts = (
  defaultConfig.resolver.assetExts || []
).concat(["bin", "gguf", "ckpt"]);

module.exports = defaultConfig;
```

3. Run Expo prebuild (clean) to generate native projects and configure native modules

```bash
npx expo prebuild --clean
```

4. Build & run (Android example)

```bash
npx expo run:android
```

Notes:

- Use development builds or CI builds that include the native C++ modules. `expo start` + `Expo Go` is insufficient.
- If adding model binaries to your app bundle, consider `android/app/src/main/assets/` (Android) and proper iOS resource placement. Large model files are often downloaded post-install via an opt-in, on-device downloader to avoid exceeding store size limits.

**Metro & Binary Assets**

When bundling large quantized model files, configure Metro and native resource inclusions. The `metro.config.js` example above ensures Metro doesn't try to treat `.gguf`/.`bin` as JS modules. You may also add Gradle packaging rules for Android to include `*.gguf` in the APK's assets or support an on-device downloader to place models in `getFilesDir()`.

**System & Hardware Recommendations**

Device requirements depend on which quantized SLM you run. These are conservative approximations; actual memory usage varies with runtime, JSI heap, and platform offload capabilities.

| Model                      | Weight Size (quantized) | Approx. Peak RAM Needed | Recommended Device                                                        |
| -------------------------- | ----------------------: | ----------------------: | ------------------------------------------------------------------------- |
| `SmolLM3-1.7B-Q4_K_M.gguf` |                 ~1.2 GB |              1.6–2.0 GB | Mid-tier phones with 4+ GB RAM (prefer 6GB+ for comfortable multitasking) |
| `Llama-3.2-3B` (quantized) |             ~2.4–3.0 GB |              2.8–3.5 GB | High-end phones (8+ GB RAM) or devices with NNAPI/ANE offload             |
| Whisper `ggml-base.bin`    |                 ~140 MB |              200–400 MB | Most modern phones                                                        |

Guidance:

- If NN accelerators are available (ANE on iOS, NNAPI on Android), runtime memory pressure and latency may improve.
- We recommend model downloads be optional and size-gated in settings.

**Onboarding & Storage Access (Android SAF)**

CallMind uses an iterative SAF folder-picker loop to gain persistent access to vendor-specific dialer recording folders. The flow:

1. Detect common vendor paths for call recordings (Samsung, Xiaomi, OnePlus).
2. Prompt user to pick a parent folder via SAF.
3. Persist the URI permission and scan contents using DocumentFile APIs.
4. Fallback to manual import if the device's ROM stores recordings in nonstandard locations.

This approach avoids broad `READ_EXTERNAL_STORAGE` on newer Android versions and increases compatibility across OEM customizations.

**Database & Indexing**

- `expo-sqlite` is used for local persistence; we enable WAL mode for concurrent reads/writes and add indexes on the ISO-8601 `deadline` text column for efficient deadline queries and calendar views.
- Keep the schema small and normalized: calls table -> transcripts table -> tasks table (with `deadline_iso` indexed).

**Developer Notes: Native Modules & JSI**

- We use JSI-backed native modules to avoid crossing the synchronous bridge frequently. Model inference runs inside native C++ contexts (wrappers around `whisper.cpp` and `llama.cpp`) and expose a minimal JavaScript API surface for batched streaming and callbacks.
- For performance, prefer streaming transcription (chunked audio) and batched prompt calls to the SLM to limit JNI/ObjC/Swift transitions.

**Privacy & Telemetry**

> All processing occurs locally. CallMind ships with telemetry disabled. Any optional crash reporting or analytics must be explicitly opted into by the end-user.

**Testing & CI**

- Unit tests for JS logic can run in Node/Jest. Native module behavior is validated via small instrumented integration tests on emulator or device.
- Example commands:

```bash
npm test
# or run Android instrumentation locally
npx detox test --configuration android.emu.debug
```

**Contributing**

- **Bug reports & feature requests**: Open an issue with reproduction steps and device logs (no user data or recordings).
- **Pull requests**: Fork, create a feature branch, write tests for JS logic, and include native changes in a separate, well-scoped commit. Keep changes minimal and well-documented.
- **Model files**: Do not commit large model binaries to the repo. Instead, provide checksums and a script to download them to `android/app/src/main/assets/models/` or the app's files directory.


**Contacts & Acknowledgements**

- Lead architect: CallMind core team
- Model runtimes: `whisper.cpp`, `llama.cpp` (thank you to the open-source communities)