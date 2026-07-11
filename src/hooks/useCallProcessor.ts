// @ts-nocheck
import { useState } from 'react';
import { prepareCallFileForWhisper } from '../services/AudioConverter';
import { aiEngine } from '../services/AiEngine';
import { saveCallAndTasks } from '../database/TaskRepository';

export type PipelineStatus = 'idle' | 'converting' | 'transcribing' | 'extracting' | 'saving' | 'failed' | 'success';

export const useCallProcessor = () => {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processCallLogFile = async (fileUri: string) => {
    setStatus('idle');
    setErrorMessage(null);
    
    // Extract base filename from native directory path
    const extractedName = fileUri.split('/').pop() || 'Unknown_Call_Record';
    setActiveFileName(extractedName);

    try {
      setStatus('converting');
      const conversion = await prepareCallFileForWhisper(fileUri);
      if (!conversion.success || !conversion.outputPath) {
        throw new Error(conversion.error || 'Audio normalization failed');
      }

      setStatus('transcribing');
      const transcript = await aiEngine.transcribeAudioFile(conversion.outputPath);
      if (!transcript) {
        throw new Error('ASR engine returned empty transcript string');
      }

      setStatus('extracting');
      const extractedTasks = await aiEngine.extractTasksFromText(transcript);

      setStatus('saving');
      const callId = `call_${Date.now()}`;
      const callRecord = {
        id: callId,
        audioPath: fileUri,
        transcript: transcript,
        createdAt: Date.now()
      };

      // Map model output schema to local repository format
      const formattedTasks = extractedTasks.map(t => ({
        taskDescription: t.task,
        deadlineDate: t.deadline,
        priority: t.priority
      }));

      await saveCallAndTasks(callRecord, formattedTasks);

      setStatus('success');
      console.log('[useCallProcessor] Local pipeline complete! Relational nodes saved.');
    } catch (error: any) {
      console.error('[useCallProcessor] Operational failure inside pipeline:', error);
      setStatus('failed');
      setErrorMessage(error.message || String(error));
    }
  };

  return { processCallLogFile, status, activeFileName, errorMessage };
};