import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Save, TriangleAlert as AlertTriangle, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { AudioUploader } from '@/components/AudioUploader';
import { AudioPlayer } from '@/components/AudioPlayer';
import type { Database } from '@/types/supabase';

type Chapter = Database['public']['Tables']['chapters']['Row'];

const AUTOSAVE_INTERVAL = 120000; // 2 minutes in milliseconds

export default function ChapterEditorScreen() {
  const { bookId, chapterId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [formData, setFormData] = useState<Partial<Chapter>>({
    title: '',
    content: '',
    order: 0,
    chapter_unit: 'Chapter',
    status: 'draft',
    book_id: bookId as string,
    audio_url: null,
  });

  // Load chapter data if editing existing chapter
  useEffect(() => {
    if (chapterId) {
      fetchChapter();
    } else {
      setLoading(false);
    }
  }, [chapterId]);

  // Set up autosave
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const autosaveTimer = setInterval(() => {
      if (hasUnsavedChanges) {
        handleSave(true);
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(autosaveTimer);
  }, [hasUnsavedChanges, formData]);

  // Prompt before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        return (e.returnValue = 'You have unsaved changes. Are you sure you want to leave?');
      }
    };

    if (Platform.OS === 'web') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges]);

  const fetchChapter = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: chapter, error: fetchError } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (fetchError) throw fetchError;
      if (chapter) {
        setFormData({
          ...chapter,
          title: chapter.title || '',
          content: chapter.content || '',
          order: chapter.order || 0,
          chapter_unit: chapter.chapter_unit || 'Chapter',
          status: chapter.status || 'draft',
          audio_url: chapter.audio_url || null,
        });
      }
    } catch (err) {
      console.error('Error fetching chapter:', err);
      setError('Failed to load chapter details');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title?.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.content?.trim()) {
      setError('Content is required');
      return false;
    }
    return true;
  };

  const handleSave = async (isAutosave: boolean = false) => {
    try {
      if (!validateForm()) return;
      
      setSaving(true);
      setError(null);

      const dataToSave = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      const { error: saveError } = chapterId
        ? await supabase
            .from('chapters')
            .update(dataToSave)
            .eq('id', chapterId)
        : await supabase
            .from('chapters')
            .insert([dataToSave]);

      if (saveError) throw saveError;

      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      
      if (!isAutosave) {
        setSuccessMessage('Chapter saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
        
        if (!chapterId) {
          router.back();
        }
      }
    } catch (err) {
      console.error('Error saving chapter:', err);
      setError(err instanceof Error ? err.message : 'Failed to save chapter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!chapterId) return;

    try {
      Alert.alert(
        'Delete Chapter',
        'Are you sure you want to delete this chapter? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeleting(true);
                setError(null);

                // Log deletion attempt
                console.log(`Attempting to delete chapter: ${chapterId}`);

                const { error: deleteError } = await supabase
                  .from('chapters')
                  .delete()
                  .eq('id', chapterId);

                if (deleteError) throw deleteError;

                // Log successful deletion
                console.log(`Successfully deleted chapter: ${chapterId}`);

                // Navigate back after successful deletion
                router.back();
              } catch (err) {
                console.error('Error deleting chapter:', err);
                setError(err instanceof Error ? err.message : 'Failed to delete chapter');
              } finally {
                setDeleting(false);
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (err) {
      console.error('Error in delete handler:', err);
      setError(err instanceof Error ? err.message : 'Failed to process deletion');
    }
  };

  const handleFieldChange = (field: keyof Chapter, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
    setError(null);
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleAudioUpload = (url: string) => {
    handleFieldChange('audio_url', url);
  };

  const handleAudioRemove = () => {
    handleFieldChange('audio_url', null);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={handleBack}>
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <Text style={styles.title}>
          {chapterId ? 'Edit Chapter' : 'New Chapter'}
        </Text>
        {lastSaved && (
          <Text style={styles.lastSaved}>
            Last saved: {lastSaved.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <AlertTriangle size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Chapter Title</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => handleFieldChange('title', text)}
            placeholder="Enter chapter title"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Chapter Unit</Text>
          <TextInput
            style={styles.input}
            value={formData.chapter_unit}
            onChangeText={(text) => handleFieldChange('chapter_unit', text)}
            placeholder="e.g., Chapter, Section, Part"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Order</Text>
          <TextInput
            style={styles.input}
            value={String(formData.order)}
            onChangeText={(text) => handleFieldChange('order', parseInt(text) || 0)}
            keyboardType="numeric"
            placeholder="Enter chapter order"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={[styles.input, styles.contentInput]}
            value={formData.content}
            onChangeText={(text) => handleFieldChange('content', text)}
            placeholder="Enter chapter content"
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Audio</Text>
          <AudioUploader
            value={formData.audio_url}
            onUpload={handleAudioUpload}
            onError={setError}
            onRemove={handleAudioRemove}
          />
          {formData.audio_url && (
            <View style={styles.audioPlayerContainer}>
              <AudioPlayer
                url={formData.audio_url}
                onError={setError}
              />
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusButtons}>
            <Pressable
              style={[
                styles.statusButton,
                formData.status === 'draft' && styles.statusButtonActive
              ]}
              onPress={() => handleFieldChange('status', 'draft')}>
              <Text style={[
                styles.statusButtonText,
                formData.status === 'draft' && styles.statusButtonTextActive
              ]}>
                Draft
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.statusButton,
                formData.status === 'published' && styles.statusButtonActive
              ]}
              onPress={() => handleFieldChange('status', 'published')}>
              <Text style={[
                styles.statusButtonText,
                formData.status === 'published' && styles.statusButtonTextActive
              ]}>
                Published
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {chapterId && (
          <Pressable 
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}>
            {deleting ? (
              <ActivityIndicator color="#ef4444" size="small" />
            ) : (
              <>
                <Trash2 size={20} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Delete Chapter</Text>
              </>
            )}
          </Pressable>
        )}
        <Pressable 
          style={styles.saveButton}
          onPress={() => handleSave()}
          disabled={saving || !hasUnsavedChanges}>
          {saving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Save size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  lastSaved: {
    fontSize: 12,
    color: '#64748b',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    color: '#10b981',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contentInput: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  audioPlayerContainer: {
    marginTop: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#6366f1',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});