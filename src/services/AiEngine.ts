import { Buffer } from "buffer";
import OpenAI from "openai";
import { getOpenAiSettings } from "./OpenAiSettingsService";

(globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer = Buffer;

export interface ExtractedTaskObject {
  task: string;
  deadline: string | null;
  priority: "high" | "medium" | "low";
}

class AiEngine {


  private buildPrompt(chunkText: string, anchorDate: string): string {
    return `You are an expert Indian task manager assistant. Analyze the following transcript chunk which contains English, Hindi, or mixed Hinglish text.
Extract all explicit actionable tasks and their deadlines from THIS chunk only.
Convert relative Indian timelines (e.g., "kal", "parso", "coming Monday", "aaj shaam") into strict YYYY-MM-DD formats based on Anchor Date: ${anchorDate}.

Output your response ONLY as a strict JSON array matching this model:
[
  {
    "task": "Task description translated cleanly to English",
    "deadline": "YYYY-MM-DD or null",
    "priority": "high/medium/low"
  }
]
If there are no tasks in this chunk, return an empty array: []
Do not return markdown ticks (\`\`\`), introduction text, or explanations. Only return the raw JSON array.

Transcript chunk:
${chunkText}`;
  }

  private splitIntoChunks(text: string, chunkWords = 600): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkWords) {
      chunks.push(words.slice(i, i + chunkWords).join(' '));
    }
    return chunks;
  }

  private async extractFromChunk(
    openai: OpenAI,
    modelName: string,
    chunk: string,
    anchorDate: string,
    chunkIndex: number,
  ): Promise<ExtractedTaskObject[]> {
    const prompt = this.buildPrompt(chunk, anchorDate);
    console.log(`[AIEngine] Sending chunk ${chunkIndex + 1} to provider...`);

    try {
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
      });

      const text = response.choices[0]?.message?.content || "";
      const finishReason = response.choices[0]?.finish_reason;
      console.log(`[AIEngine] 🤖 Chunk ${chunkIndex + 1} raw output (finish_reason=${finishReason}):\n`, text);

      if (!text.trim()) {
        console.warn(`[AIEngine] Chunk ${chunkIndex + 1} returned empty response, skipping.`);
        return [];
      }

      if (finishReason === "length") {
        console.warn(`[AIEngine] Chunk ${chunkIndex + 1} was cut off (max_tokens hit). JSON may be incomplete.`);
      }

      let cleanJsonString = text.replace(/```json|```/g, "").trim();
      const arrayMatch = cleanJsonString.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        console.warn(`[AIEngine] Chunk ${chunkIndex + 1} had no JSON array in output, skipping.`);
        return [];
      }
      cleanJsonString = arrayMatch[0];

      const parsed = JSON.parse(cleanJsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`[AIEngine] Chunk ${chunkIndex + 1} failed, skipping:`, e);
      return [];
    }
  }

  async extractTasksFromText(
    transcript: string,
  ): Promise<ExtractedTaskObject[]> {
    const { providerUrl, apiKey, modelName } = await getOpenAiSettings();

    if (!apiKey) {
      console.error("[AIEngine] OpenAI API key is missing. Please configure it in settings.");
      return [];
    }

    const openai = new OpenAI({ baseURL: providerUrl, apiKey });
    const anchorDate = new Date().toISOString().split("T")[0];
    const chunks = this.splitIntoChunks(transcript);

    console.log(`[AIEngine] Transcript split into ${chunks.length} chunk(s). Dispatching...`);

    try {
      // Process all chunks in parallel
      const chunkResults = await Promise.all(
        chunks.map((chunk, i) => this.extractFromChunk(openai, modelName, chunk, anchorDate, i))
      );

      // Flatten and deduplicate by task description
      const allTasks = chunkResults.flat();
      const seen = new Set<string>();
      const deduplicated = allTasks.filter(t => {
        const key = t.task.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      console.log("[AIEngine] ✅ Extracted tasks:\n", JSON.stringify(deduplicated, null, 2));
      return deduplicated;
    } catch (e) {
      console.error("[AIEngine] Task extraction failed via OpenAI provider:", e);
      return [];
    }
  }

}

export const aiEngine = new AiEngine();
