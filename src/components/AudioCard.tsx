import React, { memo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import type { AudioFile } from '../services/StorageService';
import type { CallRecord } from '../database/TaskRepository';

export interface AudioCardProps {
  item: AudioFile;
  record?: CallRecord;
  isActive: boolean;
  player: AudioPlayer;
  isProcessing: boolean;
  isQueued: boolean;
  statusText: string;
  onPlayToggle: (uri: string) => void;
  onProcess: (file: AudioFile) => void;
  onViewTranscript: (callId: string) => void;
  onDelete: (record: CallRecord) => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const ActiveProgressBar = memo(({ player }: { player: AudioPlayer }) => {
  const status = useAudioPlayerStatus(player);
  const currentTime = status.currentTime;
  const duration = status.duration;

  if (duration <= 0) return null;

  return (
    <View style={{ marginTop: 8, marginBottom: 4 }}>
      <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <View 
          style={{ 
            height: '100%', 
            backgroundColor: '#2563eb', 
            width: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` 
          }} 
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: '#6b7280' }}>{formatTime(currentTime)}</Text>
        <Text style={{ fontSize: 10, color: '#6b7280' }}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
});

const ActivePlayIcon = memo(({ player, uri, onPlayToggle }: { player: AudioPlayer, uri: string, onPlayToggle: (uri: string) => void }) => {
  const status = useAudioPlayerStatus(player);
  return (
    <Pressable 
      style={styles.iconContainer}
      onPress={() => onPlayToggle(uri)}
    >
      <Ionicons name={status.playing ? "pause" : "play"} size={24} color="#2563eb" />
    </Pressable>
  );
});

export const AudioCard = memo(({
  item, record, isActive, player, isProcessing, isQueued, statusText,
  onPlayToggle, onProcess, onViewTranscript, onDelete
}: AudioCardProps) => {
  return (
    <View style={styles.fileCard}>
      {isActive && player ? (
        <ActivePlayIcon player={player} uri={item.uri} onPlayToggle={onPlayToggle} />
      ) : (
        <Pressable 
          style={styles.iconContainer}
          onPress={() => onPlayToggle(item.uri)}
        >
          <Ionicons name="play" size={24} color="#2563eb" />
        </Pressable>
      )}
      <View style={styles.fileInfo}>
        <Text style={styles.fileName}>
          {item.name}
        </Text>
        {item.phoneNumber && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
             <Ionicons name="call" size={14} color="#6b7280" />
             <Text style={{ fontSize: 13, color: '#4b5563', fontWeight: '500' }}>{item.phoneNumber}</Text>
          </View>
        )}
        {item.parsedTime && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
             <Ionicons name="time" size={14} color="#9ca3af" />
             <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.parsedTime}</Text>
          </View>
        )}
        
        {isActive && player && <ActiveProgressBar player={player} />}

        {isProcessing ? (
           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '500' }}>{statusText}</Text>
           </View>
        ) : isQueued ? (
           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500' }}>Queued...</Text>
           </View>
        ) : record ? (
           <View style={styles.actionRow}>
             <Pressable 
               style={styles.actionButton}
               onPress={() => onViewTranscript(record.id)}
             >
               <Ionicons name="document-text" size={14} color="#2563eb" />
               <Text style={styles.actionButtonText}>View Transcript</Text>
             </Pressable>
             <Pressable
               style={[styles.actionButton, styles.actionButtonDanger]}
               onPress={() => onDelete(record)}
             >
               <Ionicons name="trash-outline" size={14} color="#ef4444" />
               <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Delete</Text>
             </Pressable>
           </View>
        ) : (
          <Pressable onPress={() => onProcess(item)}>
            <Text style={styles.fileMetaTap}>Tap to process</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
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
});
