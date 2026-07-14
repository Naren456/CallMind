// @ts-nocheck
import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  ActivityIndicator, Pressable, Modal, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getFolderUri, getAudioFilesFromCache, syncAudioFilesWithStorage, type AudioFile } from '../../services/StorageService';

import { aiEngine } from '../../services/AiEngine';
import { saveCallAndTasks, getAllCalls, deleteCall, type CallRecord } from '../../database/TaskRepository';
import { transcribeWithAssemblyAI } from '../../services/CloudTranscriptionService';
import { groupFilesByDate } from '../../utils/fileUtils';
import { useAudioPlayer } from 'expo-audio';
import { AudioCard } from '../../components/AudioCard';

const PAGE_SIZE = 20;

const History = () => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasFolderAccess, setHasFolderAccess] = useState(false);

  // Pipeline queue state
  const [processingQueue, setProcessingQueue] = useState<{uri: string, name: string}[]>([]);
  const [activeProcessingUri, setActiveProcessingUri] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<Record<string, string>>({});

  // Processed state
  const [processedCalls, setProcessedCalls] = useState<CallRecord[]>([]);
  const [currentPlayingUri, setCurrentPlayingUri] = useState<string | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  
  // Audio Player
  const player = useAudioPlayer(currentPlayingUri || '');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchFiles = async () => {
        const folderUri = await getFolderUri();

        if (!folderUri) {
          if (isActive) {
            setHasFolderAccess(false);
            setIsLoading(false);
          }
          return;
        }

        setHasFolderAccess(true);
        const calls = await getAllCalls();
        let files = await getAudioFilesFromCache();

        if (files.length === 0) {
          if (isActive) setIsSyncing(true);
          await syncAudioFilesWithStorage(folderUri);
          files = await getAudioFilesFromCache();
        } else {
          // Normal background sync, auto-process any newly found files
          const newFiles = await syncAudioFilesWithStorage(folderUri);
          if (newFiles.length > 0 && isActive) {
            setProcessingQueue(prev => {
              const toAdd = newFiles
                .filter(nf => !prev.some(pf => pf.uri === nf.uri))
                .map(nf => ({ uri: nf.uri, name: nf.name }));
              return [...prev, ...toAdd];
            });
            files = await getAudioFilesFromCache(); // refresh list
          }
        }

        if (isActive) {
          setAudioFiles(files);
          setProcessedCalls(calls);
          setIsSyncing(false);
          setIsLoading(false);
        }
      };

      void fetchFiles();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1); // Reset pagination on refresh
    const folderUri = await getFolderUri();
    if (folderUri) {
      setHasFolderAccess(true);
      const newFiles = await syncAudioFilesWithStorage(folderUri);
      
      if (newFiles.length > 0) {
        setProcessingQueue(prev => {
          const toAdd = newFiles
            .filter(nf => !prev.some(pf => pf.uri === nf.uri))
            .map(nf => ({ uri: nf.uri, name: nf.name }));
          return [...prev, ...toAdd];
        });
      }
      
      const files = await getAudioFilesFromCache();
      const calls = await getAllCalls();
      setAudioFiles(files);
      setProcessedCalls(calls);
    } else {
      setHasFolderAccess(false);
    }
    setIsRefreshing(false);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (page * PAGE_SIZE < audioFiles.length) {
      setPage(prev => prev + 1);
    }
  }, [page, audioFiles.length]);

  useEffect(() => {
    const processNext = async () => {
      if (activeProcessingUri === null && processingQueue.length > 0) {
        const nextItem = processingQueue[0];
        await runPipeline(nextItem.uri, nextItem.name);
      }
    };
    void processNext();
  }, [processingQueue, activeProcessingUri]);

  const updateStatus = (uri: string, status: string) => {
    setProcessingStatus(prev => ({ ...prev, [uri]: status }));
  };

  const runPipeline = async (uri: string, name: string) => {
    setActiveProcessingUri(uri);
    try {
      updateStatus(uri, 'Uploading to AssemblyAI…');
      const transcript = await transcribeWithAssemblyAI(uri, (status) => {
        updateStatus(uri, `Cloud transcription: ${status}…`);
      });

      if (!transcript || transcript.length < 5) {
        throw new Error('Transcription was empty or too short.');
      }

      updateStatus(uri, 'Extracting Tasks...');
      const tasks = await aiEngine.extractTasksFromText(transcript);

      updateStatus(uri, 'Saving to Database...');
      const callRecord = {
        id: `call_${Date.now()}`,
        audioPath: uri,
        transcript,
        createdAt: new Date().toISOString(),
      };

      const tasksToSave = tasks.map(t => ({
        taskDescription: t.task,
        deadlineDate: t.deadline,
        priority: t.priority,
      }));

      await saveCallAndTasks(callRecord, tasksToSave);

      // Update local state to show transcript button immediately
      setProcessedCalls(prev => [callRecord, ...prev]);

    } catch (error) {
      console.error('[Pipeline] Error processing file:', error);
      alert('Failed to process file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActiveProcessingUri(null);
      setProcessingQueue(prev => prev.filter(item => item.uri !== uri));
    }
  };

  const handleProcessFile = useCallback((file: AudioFile) => {
    setProcessingQueue(prev => {
      if (prev.some(f => f.uri === file.uri)) return prev;
      return [...prev, { uri: file.uri, name: file.name }];
    });
  }, []);

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'application/octet-stream'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setProcessingQueue(prev => {
        if (prev.some(f => f.uri === asset.uri)) return prev;
        return [...prev, { uri: asset.uri, name: asset.name }];
      });
    } catch (err) {
      console.error('[Upload] DocumentPicker error:', err);
      alert('Could not open file picker. Please try again.');
    }
  };

  const handlePlayToggle = useCallback((uri: string) => {
    if (currentPlayingUri === uri) {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } else {
      setCurrentPlayingUri(uri);
      setShouldAutoPlay(true);
    }
  }, [currentPlayingUri, player]);

  useEffect(() => {
    if (shouldAutoPlay && player && currentPlayingUri) {
      player.play();
      setShouldAutoPlay(false);
    }
  }, [player, currentPlayingUri, shouldAutoPlay]);

  const handleDeleteCall = useCallback((record: CallRecord) => {
    Alert.alert(
      'Delete Recording',
      'This will permanently delete the transcript and all extracted tasks for this recording. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCall(record.id);
            setProcessedCalls(prev => prev.filter(c => c.id !== record.id));
          },
        },
      ]
    );
  }, []);

  const handleViewTranscript = useCallback((callId: string) => {
    router.push({ pathname: '/transcript/[id]', params: { id: callId } });
  }, []);

  const renderItem = useCallback(({ item }: { item: AudioFile }) => {
    const record = processedCalls.find(c => c.audioPath === item.uri);
    const isActive = currentPlayingUri === item.uri;
    const isThisItemProcessing = activeProcessingUri === item.uri;
    const isThisItemQueued = processingQueue.some(q => q.uri === item.uri) && !isThisItemProcessing;

    return (
      <AudioCard
        item={item}
        record={record}
        isActive={isActive}
        player={player}
        isProcessing={isThisItemProcessing}
        isQueued={isThisItemQueued}
        statusText={processingStatus[item.uri] || 'Starting...'}
        onPlayToggle={handlePlayToggle}
        onProcess={handleProcessFile}
        onViewTranscript={handleViewTranscript}
        onDelete={handleDeleteCall}
      />
    );
  }, [
    processedCalls, currentPlayingUri, player,
    activeProcessingUri, processingQueue, processingStatus,
    handlePlayToggle, handleProcessFile, handleViewTranscript, handleDeleteCall
  ]);

  const renderFlashListItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
        </View>
      );
    }
    return renderItem({ item: item as unknown as AudioFile });
  }, [renderItem]);

  const flattenedFiles = useMemo(() => {
    const paginatedFiles = audioFiles.slice(0, page * PAGE_SIZE);
    const groups = groupFilesByDate(paginatedFiles);
    const flattened: any[] = [];
    groups.forEach(group => {
      flattened.push({ type: 'header', title: group.title, id: `header-${group.title}` });
      group.data.forEach(item => {
        flattened.push({ type: 'item', ...item, id: item.uri });
      });
    });
    return flattened;
  }, [audioFiles, page]);

  if (isLoading || isSyncing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        {isSyncing && (
          <Text style={{ marginTop: 16, color: '#4b5563', fontSize: 16, fontWeight: '500' }}>
            Indexing call history...
          </Text>
        )}
      </View>
    );
  }

  if (!hasFolderAccess) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="folder-open" size={48} color="#9ca3af" />
        <Text style={styles.emptyTitle}>Folder Not Selected</Text>
        <Text style={styles.emptyDescription}>
          CallMind needs access to your call recordings folder to show your history.
        </Text>
        <Pressable style={styles.uploadButton} onPress={handleUploadFile}>
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.uploadButtonText}>Upload Audio File</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Call History</Text>
        <Pressable style={styles.uploadButtonSmall} onPress={handleUploadFile}>
          <Ionicons name="cloud-upload-outline" size={18} color="#2563eb" />
          <Text style={styles.uploadButtonSmallText}>Upload</Text>
        </Pressable>
      </View>

      {audioFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Recordings Found</Text>
          <Text style={styles.emptyDescription}>
            We couldn't find any audio files in the selected folder.
          </Text>
          <Pressable style={[styles.uploadButton, { marginTop: 24 }]} onPress={handleUploadFile}>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>Upload Audio File</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1, width: '100%' }}>
          <FlashList
            data={flattenedFiles}
            keyExtractor={(item) => item.id}
            getItemType={(item) => item.type}
            renderItem={renderFlashListItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            estimatedItemSize={100}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              <View>
                {page * PAGE_SIZE < audioFiles.length ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#2563eb" />
                  </View>
                ) : null}
              </View>
            }
          />
        </View>
      )}



    </View>
  );
};

export default History;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 20,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  uploadButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  uploadButtonSmallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  fileInfo: {
    flex: 1,
    marginRight: 16,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  fileMetaTap: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  actionButtonDanger: {
    backgroundColor: '#fff1f2',
  },
  actionButtonTextDanger: {
    color: '#ef4444',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  uploadFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    backgroundColor: '#eff6ff',
  },
  uploadFooterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
  },
  overlayStatus: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  overlayWarning: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
    lineHeight: 18,
  },
  transcriptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  transcriptContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  transcriptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});