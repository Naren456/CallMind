// @ts-nocheck
import React, { useState, useCallback, memo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPendingTasks, completeTask, type ExtractedTask } from '../../database/TaskRepository';

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#10b981';
    default: return '#6b7280';
  }
};

const TaskCard = memo(({ item, onComplete }: { item: ExtractedTask, onComplete: (id: number) => void }) => (
  <View style={styles.taskCard}>
    <Pressable style={styles.checkbox} onPress={() => item.id && onComplete(item.id)}>
      <View style={styles.checkboxInner} />
    </Pressable>
    
    <View style={styles.taskContent}>
      <Text style={styles.taskDescription}>{item.taskDescription}</Text>
      
      <View style={styles.taskMetaRow}>
        <View style={[styles.badge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Text style={[styles.badgeText, { color: getPriorityColor(item.priority) }]}>
            {item.priority.toUpperCase()}
          </Text>
        </View>
        
        {item.deadlineDate && (
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.dateText}>{item.deadlineDate}</Text>
          </View>
        )}
      </View>
    </View>
  </View>
));

const Home = () => {
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTasks = async () => {
    setIsRefreshing(true);
    const pending = await getPendingTasks();
    setTasks(pending);
    setIsRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      void fetchTasks();
    }, [])
  );

  const handleComplete = useCallback(async (taskId: number) => {
    // Optimistic UI update
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await completeTask(taskId);
  }, []);

  const renderTask = useCallback(({ item }: { item: ExtractedTask }) => (
    <TaskCard item={item} onComplete={handleComplete} />
  ), [handleComplete]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Task List</Text>
      
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={56} color="#10b981" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyDescription}>
            Go to the History tab and process a call recording to extract new tasks.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, width: '100%' }}>
          <FlashList
            data={tasks}
            keyExtractor={(item: ExtractedTask, index) => item.id?.toString() || index.toString()}
            renderItem={renderTask}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isRefreshing}
            onRefresh={fetchTasks}
            estimatedItemSize={100}
          />
        </View>
      )}
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 16,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  taskContent: {
    flex: 1,
  },
  taskDescription: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 12,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
