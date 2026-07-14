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

export const getPendingTasks = async (): Promise<ExtractedTask[]> => {
  const db = await getDB();
  const result = await db.getAllAsync<any>(`
    SELECT * FROM tasks 
    WHERE is_completed = 0 
    ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END,
      deadline_date ASC
  `);
  
  return result.map((row) => ({
    id: row.id,
    callId: row.call_id,
    taskDescription: row.task_description,
    deadlineDate: row.deadline_date,
    priority: row.priority,
    isCompleted: row.is_completed
  }));
};

export const completeTask = async (taskId: number): Promise<void> => {
  const db = await getDB();
  await db.runAsync('UPDATE tasks SET is_completed = 1 WHERE id = ?', [taskId]);
};

export const getAllCalls = async (): Promise<CallRecord[]> => {
  const db = await getDB();
  const result = await db.getAllAsync<any>(`
    SELECT id, audio_path as audioPath, transcript, created_at as createdAt 
    FROM calls 
    ORDER BY created_at DESC
  `);
  
  return result.map((row) => ({
    id: row.id,
    audioPath: row.audioPath,
    transcript: row.transcript,
    createdAt: row.createdAt
  }));
};

export const getCallById = async (id: string): Promise<CallRecord | null> => {
  const db = await getDB();
  const row = await db.getFirstAsync<any>(`
    SELECT id, audio_path as audioPath, transcript, created_at as createdAt 
    FROM calls 
    WHERE id = ?
  `, [id]);
  
  if (!row) return null;
  return {
    id: row.id,
    audioPath: row.audioPath,
    transcript: row.transcript,
    createdAt: row.createdAt
  };
};

export const deleteCall = async (callId: string): Promise<void> => {
  const db = await getDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM tasks WHERE call_id = ?', [callId]);
    await db.runAsync('DELETE FROM calls WHERE id = ?', [callId]);
  });
};

export interface CachedAudioFile {
  uri: string;
  name: string;
  parsedDate?: string | null;
  parsedTime?: string | null;
  phoneNumber?: string | null;
}

export const getCachedAudioFiles = async (): Promise<Record<string, CachedAudioFile>> => {
  const db = await getDB();
  const rows = await db.getAllAsync<any>('SELECT uri, name, parsed_date, parsed_time, phone_number FROM cached_audio_files');
  
  const cacheMap: Record<string, CachedAudioFile> = {};
  for (const row of rows) {
    cacheMap[row.uri] = {
      uri: row.uri,
      name: row.name,
      parsedDate: row.parsed_date,
      parsedTime: row.parsed_time,
      phoneNumber: row.phone_number,
    };
  }
  return cacheMap;
};

export const upsertCachedAudioFile = async (file: CachedAudioFile): Promise<void> => {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO cached_audio_files (uri, name, parsed_date, parsed_time, phone_number) 
     VALUES (?, ?, ?, ?, ?)`,
    [file.uri, file.name, file.parsedDate || null, file.parsedTime || null, file.phoneNumber || null]
  );
};

export const upsertCachedAudioFilesBatch = async (files: CachedAudioFile[]): Promise<void> => {
  if (files.length === 0) return;
  const db = await getDB();
  
  // Use a transaction for bulk inserts for massive speedup
  await db.withTransactionAsync(async () => {
    for (const file of files) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_audio_files (uri, name, parsed_date, parsed_time, phone_number) 
         VALUES (?, ?, ?, ?, ?)`,
        [file.uri, file.name, file.parsedDate || null, file.parsedTime || null, file.phoneNumber || null]
      );
    }
  });
};

export const getAllCachedAudioFilesList = async (): Promise<CachedAudioFile[]> => {
  const db = await getDB();
  const rows = await db.getAllAsync<any>('SELECT uri, name, parsed_date, parsed_time, phone_number FROM cached_audio_files');
  
  const files = rows.map((row) => ({
    uri: row.uri,
    name: row.name,
    parsedDate: row.parsed_date,
    parsedTime: row.parsed_time,
    phoneNumber: row.phone_number,
  }));

  // Sort files by date and time descending
  return files.sort((a, b) => {
    const timeA = a.parsedTime ? ` ${a.parsedTime}` : '';
    const timeB = b.parsedTime ? ` ${b.parsedTime}` : '';
    const dateA = new Date(`${a.parsedDate}${timeA}`).getTime();
    const dateB = new Date(`${b.parsedDate}${timeB}`).getTime();

    if (isNaN(dateA) && isNaN(dateB)) return b.name.localeCompare(a.name);
    if (isNaN(dateA)) return 1; // Put Unknown Dates at the end
    if (isNaN(dateB)) return -1;
    
    // If dates are exactly the same, sort by name
    if (dateB === dateA) return b.name.localeCompare(a.name);
    
    return dateB - dateA;
  });
};

export const removeDeletedAudioFiles = async (validUris: string[]): Promise<void> => {
  const db = await getDB();
  // Using NOT IN clause for simple arrays
  // If validUris is empty, we wipe the cache.
  if (validUris.length === 0) {
    await db.runAsync('DELETE FROM cached_audio_files');
    return;
  }
  
  // Create a parameterized query string for the NOT IN clause
  const placeholders = validUris.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM cached_audio_files WHERE uri NOT IN (${placeholders})`, validUris);
};