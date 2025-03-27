import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

const initialFormState: Partial<Book> = {
  title: '',
  description: '',
  cover_url: '',
  status: 'draft',
  author: '',
  order: 0,
};

export default function BookEditorScreen() {
  const { bookId } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Book>>(initialFormState);

  useEffect(() => {
    if (bookId) {
      fetchBook();
    }
  }, [bookId]);

  const fetchBook = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: book, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (fetchError) throw fetchError;
      if (book) {
        setFormData({
          ...initialFormState,
          ...book,
          title: book.title || '',
          description: book.description || '',
          cover_url: book.cover_url || '',
          author: book.author || '',
          status: book.status || 'draft',
          order: book.order || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching book:', err);
      setError('Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      setError(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);

        const fileName = `${Date.now()}.jpg`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('book-covers')
          .upload(filePath, decode(result.assets[0].base64), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('book-covers')
          .getPublicUrl(filePath);

        setFormData(prev => ({
          ...prev,
          cover_url: publicUrl || '',
        }));
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      cover_url: '',
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!formData.title) {
        throw new Error('Title is required');
      }

      const dataToSave = {
        ...formData,
        title: formData.title || '',
        description: formData.description || '',
        cover_url: formData.cover_url || '',
        author: formData.author || '',
        status: formData.status || 'draft',
        order: formData.order || 0,
      };

      const { error: saveError } = bookId
        ? await supabase
            .from('books')
            .update(dataToSave)
            .eq('id', bookId)
        : await supabase
            .from('books')
            .insert([dataToSave]);

      if (saveError) throw saveError;

      router.back();
    } catch (err) {
      console.error('Error saving book:', err);
      setError(err instanceof Error ? err.message : 'Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      Alert.alert(
        'Delete Book',
        'Are you sure you want to delete this book? This action cannot be undone and will delete all associated chapters.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeleting(true);
                setError(null);

                const { error: deleteError } = await supabase
                  .from('books')
                  .delete()
                  .eq('id', bookId);

                if (deleteError) throw deleteError;

                router.back();
              } catch (err) {
                console.error('Error deleting book:', err);
                setError(err instanceof Error ? err.message : 'Failed to delete book');
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
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <Text style={styles.title}>
          {bookId ? 'Edit Book' : 'New Book'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Cover Image</Text>
          <View style={styles.coverSection}>
            {formData.cover_url ? (
              <View style={styles.coverPreview}>
                <Image
                  source={{ uri: formData.cover_url }}
                  style={styles.coverImage}
                />
                <Pressable 
                  style={styles.removeCoverButton}
                  onPress={handleRemoveImage}>
                  <X size={20} color="#ef4444" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.coverPlaceholder}>
                <ImageIcon size={32} color="#64748b" />
                <Text style={styles.coverPlaceholderText}>No cover image</Text>
              </View>
            )}
            <View style={styles.coverActions}>
              <Pressable 
                style={styles.uploadButton}
                onPress={handleImagePick}
                disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <>
                    <Upload size={20} color="#6366f1" />
                    <Text style={styles.uploadButtonText}>
                      Upload Image
                    </Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.orText}>or</Text>
              <TextInput
                style={styles.input}
                value={formData.cover_url || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, cover_url: text }))}
                placeholder="Enter cover image URL"
              />
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={formData.title || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder="Enter book title"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Author</Text>
          <TextInput
            style={styles.input}
            value={formData.author || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, author: text }))}
            placeholder="Enter author name"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description || ''}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Enter book description"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusButtons}>
            <Pressable
              style={[
                styles.statusButton,
                formData.status === 'draft' && styles.statusButtonActive
              ]}
              onPress={() => setFormData(prev => ({ ...prev, status: 'draft' }))}>
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
              onPress={() => setFormData(prev => ({ ...prev, status: 'published' }))}>
              <Text style={[
                styles.statusButtonText,
                formData.status === 'published' && styles.statusButtonTextActive
              ]}>
                Published
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.actions}>
          {bookId && (
            <Pressable 
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={deleting}>
              {deleting ? (
                <ActivityIndicator color="#ef4444" size="small" />
              ) : (
                <>
                  <Trash2 size={20} color="#ef4444" />
                  <Text style={styles.deleteButtonText}>Delete Book</Text>
                </>
              )}
            </Pressable>
          )}
          <View style={styles.rightActions}>
            <Pressable 
              style={styles.cancelButton}
              onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {bookId ? 'Save Changes' : 'Create Book'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
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
  coverSection: {
    gap: 16,
  },
  coverPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  coverImage: {
    width: 160,
    height: 240,
    borderRadius: 8,
  },
  removeCoverButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  coverPlaceholder: {
    width: 160,
    height: 240,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 14,
    color: '#64748b',
  },
  coverActions: {
    gap: 12,
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
  orText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
});