import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Play, FileAudio, FolderOpen, FileText } from 'lucide-react-native';

interface RecordingFile {
  name: string;
  uri: string;
  id: string;
  date: string;
  time: string;
  timestamp: number;
  formattedSize: string;
}

interface Section {
  title: string;
  data: RecordingFile[];
}
import { extractDateFromFilename, extractContactName } from '../../utils/fileParser';

export default function HomeScreen() {
  const [recordings, setRecordings] = useState<Section[]>([]);
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
      console.log("Raw files from directory:", files);
      
      // Filter for audio files
      const audioUris = files.filter(file => file.endsWith('.m4a') || file.endsWith('.wav') || file.endsWith('.mp3'));
      
      const filePromises = audioUris.map(async (fileUri, index) => {
        const decodedUri = decodeURIComponent(fileUri);
        const fileName = decodedUri.split('/').pop() || `Audio_${index}`;
        
        let dateStr = "Unknown Date";
        let timeStr = "";
        let timestamp = 0;
        let formattedSize = "";
        
        // 1. Try to extract date from the filename first
        const parsedDate = extractDateFromFilename(fileName);
        if (parsedDate) {
          dateStr = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          timeStr = parsedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          timestamp = parsedDate.getTime();
        }
        
        try {
          const info = await FileSystem.getInfoAsync(fileUri);
          console.log("File info:", info);
          if (info.exists) {
            // Get Size
            if (info.size) {
              const sizeInMB = (info.size / (1024 * 1024)).toFixed(2);
              formattedSize = `${sizeInMB} MB`;
            }

            // Get Date/Time from metadata as fallback
            if (info.modificationTime) {
              const ms = info.modificationTime < 10000000000 ? info.modificationTime * 1000 : info.modificationTime;
              const dateObj = new Date(ms);
              
              // Only use fallback date if filename parsing failed
              if (!parsedDate) {
                dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                timestamp = ms;
              }
            }
          }
        } catch (e) {
          console.warn("Could not get info for", fileUri);
        }
        
        // Extract a clean display name (e.g., "Yash Solanki" or "+918031314653")
        const displayName = extractContactName(fileName);
        
        return {
          name: displayName,
          uri: fileUri,
          id: index.toString(),
          date: dateStr,
          time: timeStr,
          timestamp,
          formattedSize
        };
      });

      const audioFiles = await Promise.all(filePromises);
      console.log("Parsed audio files data:", JSON.stringify(audioFiles, null, 2));

      // Group by date
      const grouped = audioFiles.reduce((acc: {[key: string]: RecordingFile[]}, file) => {
        if (!acc[file.date]) acc[file.date] = [];
        acc[file.date].push(file);
        return acc;
      }, {});

      // Convert grouped object to sections array and sort by date descending
      const sections: Section[] = Object.keys(grouped).map(date => ({
        title: date,
        data: grouped[date].sort((a, b) => b.timestamp - a.timestamp)
      })).sort((a, b) => {
        if (a.title === "Unknown Date") return 1;
        if (b.title === "Unknown Date") return -1;
        return b.data[0].timestamp - a.data[0].timestamp;
      });

      setRecordings(sections);
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
        <Text style={styles.recordingDate}>
          {item.time ? `${item.time} ` : ''}
          {item.formattedSize ? `• ${item.formattedSize}` : ''}
        </Text>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <FileText color="#E2E8F0" size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Play color="#E2E8F0" size={20} />
        </TouchableOpacity>
      </View>
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
        <SectionList
          sections={recordings}
          keyExtractor={(item) => item.id}
          renderItem={renderRecordingItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
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
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginTop: 20,
    marginBottom: 12,
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
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
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
