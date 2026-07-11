import { initWhisper } from 'whisper.rn';
import { initLlama } from 'llama.rn';
import { getLocalModelPath } from './ModelManager';

export interface ExtractedTaskObject {
  task: string;
  deadline: string | null;
  priority: 'high' | 'medium' | 'low';
}

class AiEngine {
  private whisperContext: any = null;
  private llamaContext: any = null;
  private isInitializing: boolean = false;

  async initializeEngines(): Promise<void> {
    if (this.whisperContext && this.llamaContext) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    console.log('[AIEngine] Waking local C++ JSI context runtimes...');

    try {
      const whisperModelPath = getLocalModelPath('WHISPER');
      const llamaModelPath = getLocalModelPath('LLAMA');

      // 1. Mount Local Whisper Context
      this.whisperContext = await initWhisper({
        filePath: whisperModelPath,
      });

      // 2. Mount Local Llama Context Optimized for 2019 ARMv8 CPUs
      this.llamaContext = await initLlama({
        model: llamaModelPath,
        use_mlock: true,      // Prevents OS from virtual-swapping active memory layers
        n_ctx: 1024,          // Constrains KV Cache size to save RAM
        n_gpu_layers: 0,      // CPU only compilation path to bypass driver crashes
        n_threads: 4,         // Lock processing to the phone's 4 core performance matrix
      });

      console.log('[AIEngine] All C++ AI memory matrix channels mounted safely.');
    } catch (error) {
      console.error('[AIEngine] Native instantiation initialization failed:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async transcribeAudioFile(wavFilePath: string): Promise<string> {
    if (!this.whisperContext) await this.initializeEngines();
    console.log('[AIEngine] Running local Whisper pass...');
    
    const { promise } = this.whisperContext.transcribe(wavFilePath, {
      beam_size: 2,        // Keeps resource usage light on older mobile processors
      temperature: 0.0,
    });

    const result = await promise;
    return result.text.trim();
  }

  async extractTasksFromText(transcript: string): Promise<ExtractedTaskObject[]> {
    if (!this.llamaContext) await this.initializeEngines();

    const anchorDate = new Date().toISOString().split('T')[0];

    // Formatted strictly for Gemma 3 conversational token sequences
    const gemmaPrompt = `<start_of_turn>user
You are an expert Indian task manager assistant. Analyze the user's transcript which contains English, Hindi, or mixed Hinglish text.
Extract all explicit actionable tasks and their deadlines.
Convert relative Indian timelines (e.g., "kal", "parso", "coming Monday", "aaj shaam") into strict YYYY-MM-DD formats based on Anchor Date: ${anchorDate}.

Output your response ONLY as a strict JSON array matching this model:
[
  {
    "task": "Task description translated cleanly to English",
    "deadline": "YYYY-MM-DD or null",
    "priority": "high/medium/low"
  }
]
Do not return markdown ticks (\`\`\`), introduction text, or explanations. Only return the raw JSON string array.<end_of_turn>
<start_of_turn>model
`;

    console.log('[AIEngine] Dispatching tokens to local Gemma 3 CPU core matrix...');
    
    const response = await this.llamaContext.completion({
      prompt: gemmaPrompt,
      temperature: 0.1, // Keep it highly deterministic
      stop: ['<end_of_turn>', '<start_of_turn>'],
    });

    try {
      const cleanJsonString = response.text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJsonString);
    } catch (e) {
      console.error('[AIEngine] Gemma 3 JSON generation failed parsing. Raw output:', response.text);
      return [];
    }
  }

  async releaseEngines(): Promise<void> {
    console.log('[AIEngine] Purging active VRAM context frameworks...');
    this.whisperContext = null;
    this.llamaContext = null;
  }
}

export const aiEngine = new AiEngine();