// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { getDB } from '../database/DbService';
import { ExtractedTask } from '../database/TaskRepository';

export const useTasks = () => {
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDB();
      
      // Query active tasks, sorting deadlines chronologically (Today/Soonest first)
      const result = await db.getAllAsync<ExtractedTask>(
        `SELECT id, call_id as callId, task_description as taskDescription, 
                deadline_date as deadlineDate, priority, is_completed as isCompleted 
         FROM tasks 
         WHERE is_completed = 0 
         ORDER BY CASE WHEN deadline_date IS NULL THEN 1 ELSE 0 END, deadline_date ASC`
      );

      setTasks(result || []);
      setError(null);
    } catch (err: any) {
      console.error('[useTasks] Query transaction crashed:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleTask = useCallback(async (id: number, currentCompletedStatus: number) => {
    try {
      const db = await getDB();
      const targetStatus = currentCompletedStatus === 0 ? 1 : 0;
      
      await db.runAsync(
        'UPDATE tasks SET is_completed = ? WHERE id = ?',
        [targetStatus, id]
      );

      // Force local reactive state reload
      await fetchTasks();
    } catch (err: any) {
      console.error('[useTasks] Toggle transaction failed:', err);
      setError(err.message || String(err));
    }
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refreshTasks: fetchTasks, handleToggleTask };
};