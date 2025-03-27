import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { BookOpen, User as User2, ChevronRight, Clock, BookMarked, Headphones, Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];

interface BookWithChapters extends Book {
  chapters?: Chapter[];
  progress?: number;
  lastRead?: string;
}

export default function BooksScreen() {
  const [books, setBooks] = useState<BookWithChapters[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;

      const booksWithChapters = await Promise.all(
        (booksData || []).map(async (book) => {
          const { data: chapters } = await supabase
            .from('chapters')
            .select('*')
            .eq('book_id', book.id)
            .order('order', { ascending: true });

          const totalChapters = chapters?.length || 0;
          const completedChapters = chapters?.filter(c => c.status === 'published').length || 0;
          const progress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

          return {
            ...book,
            chapters: chapters || [],
            progress,
            lastRead: chapters?.find(c => c.updated_at)?.updated_at,
          };
        })
      );

      setBooks(booksWithChapters);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to load books. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookPress = (bookId: string) => {
    router.push(`/books/${bookId}/chapters`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading your library...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable 
            style={styles.retryButton}
            onPress={fetchBooks}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : books.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={48} color="#6366f1" />
          <Text style={styles.emptyStateTitle}>Your library is empty</Text>
          <Text style={styles.emptyStateText}>
            No books have been added to your library yet
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {books.map((book) => (
            <Pressable
              key={book.id}
              style={styles.bookCard}
              onPress={() => handleBookPress(book.id)}>
              <Image
                source={{ 
                  uri: book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80' 
                }}
                style={styles.bookCover}
              />
              <View style={styles.bookInfo}>
                <View>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookAuthor}>
                    {book.author || 'Unknown Author'}
                  </Text>
                </View>
                
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${book.progress || 0}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {Math.round(book.progress || 0)}% Complete
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
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
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
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
  content: {
    padding: 20,
    gap: 16,
  },
  bookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  bookCover: {
    width: 100,
    height: 150,
    resizeMode: 'cover',
  },
  bookInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#64748b',
  },
  progressSection: {
    marginTop: 'auto',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
  },
});