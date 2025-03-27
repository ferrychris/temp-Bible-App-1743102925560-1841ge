import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, BookOpen, Lock, Play, ChevronRight, CreditCard as Edit2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];

interface BookWithChapters extends Book {
  chapters: Chapter[];
}

export default function ChaptersScreen() {
  const { id } = useLocalSearchParams();
  const [book, setBook] = useState<BookWithChapters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookAndChapters();
  }, [id]);

  const fetchBookAndChapters = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch book details
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (bookError) throw bookError;

      // Fetch chapters
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', id)
        .order('order', { ascending: true });

      if (chaptersError) throw chaptersError;

      setBook({
        ...bookData,
        chapters: chapters || [],
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleChapterPress = (chapterId: string) => {
    router.push(`/books/${id}/chapters/${chapterId}`);
  };

  const handleBackToLibrary = () => {
    router.push('/books');
  };

  const handleEditBook = () => {
    router.push({
      pathname: '/(tabs)/(admin)/book',
      params: { bookId: id }
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Book not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={handleBackToLibrary}
          accessibilityLabel="Go back to library">
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <Text style={styles.title}>Book Details</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.bookInfo}>
          <Image
            source={{ 
              uri: book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80' 
            }}
            style={styles.bookCover}
          />
          <View style={styles.bookDetails}>
            <View style={styles.bookHeader}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Pressable 
                style={styles.editButton}
                onPress={handleEditBook}>
                <Edit2 size={20} color="#6366f1" />
              </Pressable>
            </View>
            <Text style={styles.bookAuthor}>
              {book.author || 'Unknown Author'}
            </Text>
            {book.description && (
              <Text 
                style={styles.bookDescription}
                numberOfLines={2}>
                {book.description}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.chaptersHeader}>
          <Text style={styles.chaptersTitle}>Table of Contents</Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable 
              style={styles.retryButton}
              onPress={fetchBookAndChapters}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : book.chapters.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color="#6366f1" />
            <Text style={styles.emptyStateTitle}>No content yet</Text>
            <Text style={styles.emptyStateText}>
              This book doesn't have any content yet
            </Text>
          </View>
        ) : (
          <View style={styles.chaptersList}>
            {book.chapters.map((chapter, index) => (
              <Pressable
                key={chapter.id}
                style={styles.chapterCard}
                onPress={() => handleChapterPress(chapter.id)}>
                <View style={styles.chapterInfo}>
                  <Text style={styles.chapterNumber}>
                    {chapter.chapter_unit || 'Section'} {index + 1}
                  </Text>
                  <Text style={styles.chapterTitle}>
                    {chapter.title}
                  </Text>
                </View>

                <View style={styles.chapterActions}>
                  {chapter.audio_url && (
                    <View style={styles.audioIndicator}>
                      <Play size={16} color="#6366f1" />
                      <Text style={styles.audioText}>Audio</Text>
                    </View>
                  )}
                  {chapter.status === 'draft' ? (
                    <Lock size={20} color="#64748b" />
                  ) : (
                    <ChevronRight size={20} color="#64748b" />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
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
  },
  bookInfo: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  bookCover: {
    width: 100,
    height: 150,
    borderRadius: 8,
    marginRight: 16,
  },
  bookDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bookTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginRight: 12,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookAuthor: {
    fontSize: 16,
    color: '#6366f1',
    marginBottom: 8,
  },
  bookDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  chaptersHeader: {
    padding: 20,
    paddingBottom: 12,
  },
  chaptersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  chaptersList: {
    padding: 20,
  },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  chapterInfo: {
    flex: 1,
    marginRight: 16,
  },
  chapterNumber: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  chapterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  audioText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
});