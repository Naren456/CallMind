import { getDB } from "./DbService";

export interface CallRecord {
    id: string;
    audioPath: string;
    transcript:string;
    createdAt:string;
}

export interface ExtractedTask {
    id? : number;
    callId : string;
    taskDescription: string;
    deadlineDate : string | null;
    priority : 'high' | 'medium' | 'low';
    isCompleted : number;
}


export const saveCallAndTasks = async (
  call: CallRecord, 
  tasks: Omit<ExtractedTask, 'callId' | 'isCompleted'>[]
): Promise<void> => {
  const db = await getDB();

  // Executed within an isolated background transaction
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO calls (id, audio_path, transcript, created_at) VALUES (?, ?, ?, ?);',
      [call.id, call.audioPath, call.transcript, call.createdAt]
    );

    for (const task of tasks) {
      await db.runAsync(
        'INSERT INTO tasks (call_id, task_description, deadline_date, priority) VALUES (?, ?, ?, ?);',
        [call.id, task.taskDescription, task.deadlineDate, task.priority]
      );
    }
  });
};