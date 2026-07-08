import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { Play, FileAudio, FolderOpen } from 'lucide-react-native';

interface RecordingFile {
  name: string;
  uri: string;
  id: string;
}

export default function HomeScreen() {
  const [recordings, setRecordings] = useState<RecordingFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolderUri, setCurrentFolderUri] = useState<string | null>(null);

  // 1. Function to ask user to select a folder
  const selectFolder = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        "Not Supported", 
        "Selecting custom folders is only supported on Android."
      );
      return;
    }

    try {
      // Opens the native folder picker
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      
      if (permissions.granted) {
        // Save the chosen folder URI
        setCurrentFolderUri(permissions.directoryUri);
        // Load files from this new folder
        loadRecordingsFromFolder(permissions.directoryUri);
      } else {
        Alert.alert("Permission Denied", "You need to grant folder access to see recordings.");
      }
    } catch (error) {
      console.error("Error picking folder:", error);
    }
  };

  // 2. Function to read files from the selected folder
  const loadRecordingsFromFolder = async (folderUri: string) => {
    try {
      setIsLoading(true);
      
      // Read all files in the chosen directory using StorageAccessFramework
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(folderUri);
      
      // Filter for audio files (add more extensions if needed)
      const audioFiles = files
        .filter(file => file.endsWith('.m4a') || file.endsWith('.wav') || file.endsWith('.mp3'))
        .map((fileUri, index) => {
          // Extract just the file name from the end of the URI for display
          const decodedUri = decodeURIComponent(fileUri);
          const fileName = decodedUri.split('/').pop() || `Audio_${index}`;
          
          return {
            name: fileName,
            uri: fileUri,
            id: index.toString()
          };
        });

      setRecordings(audioFiles);
    } catch (error) {
      console.error("Error reading folder:", error);
      Alert.alert("Error", "Could not read the selected folder.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderRecordingItem = ({ item }: { item: RecordingFile }) => (
    <TouchableOpacity style={styles.recordingCard}>
      <View style={styles.iconContainer}>
        <FileAudio color="#FF7F50" size={24} />
      </View>
      <View style={styles.recordingInfo}>
        <Text style={styles.recordingName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.recordingDate}>Tap to play or view transcript</Text>
      </View>
      <TouchableOpacity style={styles.playButton}>
        <Play color="#E2E8F0" size={20} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Home Dashboard</Text>
          <Text style={styles.subtitle}>Your recent transcriptions</Text>
        </View>
        <TouchableOpacity style={styles.folderButton} onPress={selectFolder}>
          <FolderOpen color="#FF7F50" size={24} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.emptyText}>Loading folder...</Text>
      ) : !currentFolderUri ? (
        <View style={styles.emptyState}>
          <FolderOpen color="#94A3B8" size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No Folder Selected</Text>
          <Text style={styles.emptySubText}>Tap the folder icon at the top right to select where your call recordings are saved.</Text>
          <TouchableOpacity style={styles.selectFolderBtn} onPress={selectFolder}>
            <Text style={styles.selectFolderBtnText}>Choose Folder</Text>
          </TouchableOpacity>
        </View>
      ) : recordings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No audio files found.</Text>
          <Text style={styles.emptySubText}>Try selecting a different folder.</Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordingItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  folderButton: {
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  listContainer: {
    paddingBottom: 20,
  },
  recordingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 127, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recordingInfo: {
    flex: 1,
    marginRight: 12,
  },
  recordingName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordingDate: {
    color: '#94A3B8',
    fontSize: 14,
  },
  playButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectFolderBtn: {
    marginTop: 24,
    backgroundColor: '#FF7F50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  selectFolderBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  }
});
