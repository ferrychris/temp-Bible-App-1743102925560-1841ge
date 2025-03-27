import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Plus, CreditCard as Edit2, ArrowLeft, BookOpen } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];

export default function BooksManagementScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;
      setBooks(booksData || []);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = () => {
    router.push('/(tabs)/(admin)/book');
  };

  const handleEditBook = (bookId: string) => {
    router.push({
      pathname: '/(tabs)/(admin)/book',
      params: { bookId }
    });
  };

  const handleViewChapters = (bookId: string) => {
    router.push({
      pathname: '/(tabs)/(admin)/chapters',
      params: { bookId }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
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
        <Text style={styles.title}>Book Management</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {successMessage && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {books.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={48} color="#6366f1" />
            <Text style={styles.emptyStateText}>No books found</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by adding your first book
            </Text>
          </View>
        ) : (
          books.map((book) => (
            <View key={book.id} style={styles.bookCard}>
              <Pressable
                style={styles.bookContent}
                onPress={() => handleViewChapters(book.id)}>
                <View style={styles.bookHeader}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    book.status === 'published' ? styles.publishedBadge : styles.draftBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      book.status === 'published' ? styles.publishedText : styles.draftText
                    ]}>
                      {book.status === 'published' ? 'Published' : 'Draft'}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookContentInner}>
                  <Image
                    source={{ 
                      uri: book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80' 
                    }}
                    style={styles.bookCover}
                  />

                  <View style={styles.bookInfo}>
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

                    <View style={styles.bookMeta}>
                      <Text style={styles.metaText}>
                        Created: {formatDate(book.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>

              <View style={styles.bookActions}>
                <Pressable 
                  style={styles.editButton}
                  onPress={() => handleEditBook(book.id)}>
                  <Edit2 size={20} color="#6366f1" />
                  <Text style={styles.editButtonText}>Edit Book</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable 
        style={styles.addButton} 
        onPress={handleAddBook}>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
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
  successContainer: {
    backgroundColor: '#dcfce7',
    padding: 12,
    margin: 20,
    borderRadius: 8,
  },
  successText: {
    color: '#10b981',
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
  bookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  bookContent: {
    padding: 16,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  publishedBadge: {
    backgroundColor: '#dcfce7',
  },
  draftBadge: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  publishedText: {
    color: '#10b981',
  },
  draftText: {
    color: '#64748b',
  },
  bookContentInner: {
    flexDirection: 'row',
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookAuthor: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 8,
  },
  bookDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  bookMeta: {
    marginTop: 'auto',
  },
  metaText: {
    fontSize: 14,
    color: '#64748b',
  },
  bookActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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