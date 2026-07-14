import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDB = async () : Promise<SQLite.SQLiteDatabase> =>{
    if(!dbInstance){
        dbInstance = await SQLite.openDatabaseAsync('callmind.db');
        await dbInstance.execAsync('PRAGMA foreign_keys = ON');
        await dbInstance.execAsync('PRAGMA journal_mode = WAL');
    }
    return dbInstance;
}

export const initializeDatabase = async (): Promise<void> => {
    try {
        const db = await getDB();
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS calls (
             id TEXT PRIMARY KEY,
             audio_path TEXT NOT NULL,
             transcript TEXT NOT NULL,
             created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            call_id TEXT NOT NULL,
            task_description TEXT NOT NULL,
            deadline_date TEXT ,-- Standardized YYYY-MM-DD string sorting layout
            priority TEXT CHECK(priority IN ('high','medium','low')) DEFAULT 'medium',
            is_completed INTEGER DEFAULT 0,
            FOREIGN KEY(call_id) REFERENCES calls(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS cached_audio_files (
             uri TEXT PRIMARY KEY,
             name TEXT NOT NULL,
             parsed_date TEXT,
             parsed_time TEXT,
             phone_number TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline_date) WHERE is_completed = 0;`
        );
        console.log('[SQLite Core] Relational schema and indexes deployed successfully.');
    }catch(error){
           console.error('[SQLite Core] Fatal exception inside database initialization:',error);
           throw error;
    }
}