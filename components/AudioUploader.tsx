import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Upload, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/aac'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface AudioUploaderProps {
  onUpload: (url: string) => void;
  onError: (error: string) => void;
  value?: string | null;
  onRemove?: () => void;
}

export function AudioUploader({ onUpload, onError, value, onRemove }: AudioUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.mimeType || '')) {
        throw new Error('Invalid file type. Please upload MP3, WAV, or AAC files only.');
      }

      // Validate file size
      if (file.size && file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 50MB limit.');
      }

      let fileData: ArrayBuffer;
      
      if (Platform.OS === 'web') {
        // For web, fetch the file and convert to ArrayBuffer
        const response = await fetch(file.uri);
        const blob = await response.blob();
        fileData = await blob.arrayBuffer();
      } else {
        // For native platforms, use FileSystem
        const base64File = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileData = decode(base64File);
      }

      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('chapter-audio')
        .upload(filePath, fileData, {
          contentType: file.mimeType || 'audio/mpeg',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('chapter-audio')
        .getPublicUrl(filePath);

      onUpload(data.publicUrl);
    } catch (err) {
      console.error('Error uploading audio:', err);
      onError(err instanceof Error ? err.message : 'Failed to upload audio file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {value ? (
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            Audio file uploaded
          </Text>
          {onRemove && (
            <Pressable 
              style={styles.removeButton}
              onPress={onRemove}>
              <X size={20} color="#ef4444" />
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable 
          style={styles.uploadButton}
          onPress={handleUpload}
          disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <>
              <Upload size={20} color="#6366f1" />
              <Text style={styles.uploadButtonText}>
                Upload Audio
              </Text>
            </>
          )}
        </Pressable>
      )}
      <Text style={styles.helpText}>
        Supported formats: MP3, WAV, AAC (max 50MB)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  removeButton: {
    padding: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#64748b',
  },
});