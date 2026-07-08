import { prisma } from '../db/client.js';
import { aai, groq } from '../config/api.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const convertToWav = async (inputBuffer: Buffer): Promise<Buffer> => {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input_${Date.now()}.tmp`);
  const outputPath = path.join(tempDir, `output_${Date.now()}.wav`);

  try {
    await fs.writeFile(inputPath, inputBuffer);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    const outputBuffer = await fs.readFile(outputPath);
    return outputBuffer;
  } finally {
    // Clean up temporary files
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
};

export const processAudio = async (audioBuffer: Buffer) => {
  console.log('🎙️ Starting transcription process...');
  
  console.log('🔄 Converting audio to .wav format...');
  const wavBuffer = await convertToWav(audioBuffer);
  
  console.log('➡️ Sending audio buffer to AssemblyAI (this may take a few minutes for large files)...');
  
  // 1. Send the audio to AssemblyAI
  const transcript = await aai.transcripts.transcribe({ audio: wavBuffer });
  if (transcript.status === 'error') {
    console.error('❌ AssemblyAI Error:', transcript.error);
    throw new Error(transcript.error);
  }
  
  const text = transcript.text || '';
  console.log(`✅ Transcription complete! Extracted ${text.length} characters of text.`);

  // 2. Extract To-Do list & Deadlines using Groq
  let summary = '';
  let todos: string[] = [];
  let deadlines: string[] = [];
  
  if (text) {
    const groqText = text.slice(0, 15000); // Truncate to prevent Groq free tier token limits (6000 TPM)
    console.log('🤖 Sending text to Groq for analysis (extracting summary, todos, and deadlines)...');
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: `You are an executive assistant. Read the following transcript and extract:
1. A brief 1-sentence summary.
2. A bulleted "To-Do List" of action items.
3. Any mentioned "Deadlines" or dates.

Return exactly and ONLY a JSON object in this format:
{
  "summary": "The 1 sentence summary",
  "todos": ["Task 1", "Task 2"],
  "deadlines": ["Friday 12th: Submit report"]
}` 
        },
        { role: 'user', content: groqText }
      ],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' }
    });
    
    console.log('✅ Groq analysis complete! Parsing JSON response...');
    const content = chatCompletion.choices[0]?.message?.content || '{}';
    try {
      const parsed = JSON.parse(content);
      summary = parsed.summary || '';
      todos = parsed.todos || [];
      deadlines = parsed.deadlines || [];
      console.log('📊 Parsed Data:', { summary, todos: todos.length, deadlines: deadlines.length });
    } catch(e) {
      console.error("❌ Failed to parse JSON from Groq:", e);
    }
  }

  // 3. Save to database
  console.log('💾 Saving structured data to Prisma database...');
  const savedData = await prisma.transcription.create({
    data: { text, summary, todos, deadlines }
  });
  console.log(`🎉 Successfully saved transcription to database! (ID: ${savedData.id})`);
  
  return savedData;
};
