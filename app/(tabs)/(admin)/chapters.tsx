import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Plus, CirclePlay as PlayCircle, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];

interface BookWithChapters extends Book {
  chapters: Chapter[];
}

export default function ChaptersManagementScreen() {
  const { bookId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    fetchBookAndChapters();
  }, [bookId]);

  const fetchBookAndChapters = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch book details
      const { data: books, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (bookError) throw bookError;
      if (books) {
        setBook(books);
      }

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('order', { ascending: true });

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = () => {
    router.push({
      pathname: '/(tabs)/(admin)/chapter',
      params: { bookId }
    });
  };

  const handleEditChapter = (chapterId: string) => {
    router.push({
      pathname: '/(tabs)/(admin)/chapter',
      params: { bookId, chapterId }
    });
  };

  const formatSerialNumber = (index: number) => {
    return `SN${String(index + 1).padStart(3, '0')}`;
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
        <View style={styles.headerContent}>
          <Text style={styles.title}>Chapters</Text>
          {book && (
            <Text style={styles.subtitle}>{book.title}</Text>
          )}
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {chapters.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No chapters yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by adding your first chapter
            </Text>
          </View>
        ) : (
          chapters.map((chapter, index) => (
            <Pressable
              key={chapter.id}
              style={styles.chapterCard}
              onPress={() => handleEditChapter(chapter.id)}>
              <View style={styles.chapterInfo}>
                <Text style={styles.serialNumber}>
                  {formatSerialNumber(index)}
                </Text>
                <Text style={styles.chapterTitle}>
                  {chapter.chapter_unit} | {chapter.title}
                </Text>
                <View style={styles.statusContainer}>
                  {chapter.audio_url && (
                    <View style={styles.audioIndicator}>
                      <PlayCircle size={16} color="#6366f1" />
                      <Text style={styles.audioText}>Audio</Text>
                    </View>
                  )}
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: chapter.status === 'published' ? '#dcfce7' : '#f1f5f9' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: chapter.status === 'published' ? '#10b981' : '#64748b' }
                    ]}>
                      {chapter.status === 'published' ? 'Published' : 'Draft'}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={handleAddChapter}>
        <Plus size={24} color="#ffffff" />
      </Pressable>
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
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    margin: 20,
    borderRadius: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  chapterCard: {
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
  },
  serialNumber: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 8,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
});