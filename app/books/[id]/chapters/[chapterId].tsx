import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Play, Volume2, BookOpen, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import RenderHtml from 'react-native-render-html';
import { supabase } from '@/lib/supabase';
import { AudioPlayer } from '@/components/AudioPlayer';
import type { Database } from '@/types/supabase';

type Book = Database['public']['Tables']['books']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];

interface ChapterWithBook extends Chapter {
  book?: Book;
}

const systemFonts = ['Inter-Regular', 'Inter-Medium', 'Inter-Bold'];

const baseStyle = {
  color: '#1e293b',
  fontSize: 16,
  lineHeight: 24,
  fontFamily: 'Inter-Regular',
};

const tagsStyles = {
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#1e293b',
  },
  p: {
    marginBottom: 16,
    lineHeight: 24,
  },
  h1: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginBottom: 16,
    marginTop: 24,
    color: '#1e293b',
  },
  h2: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    marginBottom: 12,
    marginTop: 20,
    color: '#1e293b',
  },
  h3: {
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    marginBottom: 12,
    marginTop: 16,
    color: '#1e293b',
  },
  ul: {
    marginBottom: 16,
  },
  ol: {
    marginBottom: 16,
  },
  li: {
    marginBottom: 8,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: '#e2e8f0',
    paddingLeft: 16,
    marginVertical: 16,
    fontStyle: 'italic',
  },
  a: {
    color: '#6366f1',
    textDecorationLine: 'underline',
  },
};

const renderersProps = {
  text: {
    selectable: true
  }
};

export default function ChapterDetailsScreen() {
  const { id: bookId, chapterId } = useLocalSearchParams();
  const [chapter, setChapter] = useState<ChapterWithBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    fetchChapterDetails();
  }, [chapterId]);

  const fetchChapterDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select(`
          *,
          book:books (*)
        `)
        .eq('id', chapterId)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);
    } catch (err) {
      console.error('Error fetching chapter:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    try {
      setCompleting(true);
      setError(null);

      // Toggle the status between 'published' and 'draft'
      const newStatus = chapter?.status === 'published' ? 'draft' : 'published';

      const { error: updateError } = await supabase
        .from('chapters')
        .update({ status: newStatus })
        .eq('id', chapterId);

      if (updateError) throw updateError;

      // Update local state
      setChapter(prev => prev ? {
        ...prev,
        status: newStatus
      } : null);

    } catch (err) {
      console.error('Error toggling chapter completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to update chapter status');
    } finally {
      setCompleting(false);
    }
  };

  const handleBack = () => {
    router.push(`/books/${bookId}/chapters`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Chapter not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={handleBack}
          accessibilityLabel="Go back to book details">
          <ArrowLeft size={24} color="#64748b" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.bookTitle}>{chapter.book?.title}</Text>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable 
              style={styles.retryButton}
              onPress={fetchChapterDetails}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {chapter.audio_url && (
              <View style={styles.audioPlayer}>
                <View style={styles.audioHeader}>
                  <Volume2 size={20} color="#6366f1" />
                  <Text style={styles.audioTitle}>Audio Version Available</Text>
                </View>
                <View style={styles.audioPlayerContainer}>
                  <AudioPlayer
                    url={chapter.audio_url}
                    fileName={chapter.title}
                    onError={setError}
                  />
                </View>
              </View>
            )}

            <View style={styles.chapterContent}>
              {chapter.content ? (
                <RenderHtml
                  contentWidth={width}
                  source={{ html: chapter.content }}
                  systemFonts={systemFonts}
                  baseStyle={baseStyle}
                  tagsStyles={tagsStyles}
                  enableExperimentalMarginCollapsing
                  renderersProps={renderersProps}
                  defaultTextProps={{ selectable: true }}
                  defaultViewProps={{ collapsable: false }}
                />
              ) : (
                <View style={styles.emptyContent}>
                  <BookOpen size={48} color="#6366f1" />
                  <Text style={styles.emptyContentTitle}>
                    No content available
                  </Text>
                  <Text style={styles.emptyContentText}>
                    This chapter hasn't been written yet
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Completion Button */}
      <View style={styles.completionContainer}>
        <Pressable
          style={[
            styles.completionButton,
            chapter.status === 'published' && styles.completedButton
          ]}
          onPress={handleToggleComplete}
          disabled={completing}>
          {completing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <CheckCircle2 size={24} color={chapter.status === 'published' ? '#10b981' : '#ffffff'} />
              <Text style={[
                styles.completionText,
                chapter.status === 'published' && styles.completedText
              ]}>
                {chapter.status === 'published' ? 'Published' : 'Mark as Published'}
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
  headerContent: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  chapterTitle: {
    fontSize: 16,
    color: '#6366f1',
    fontFamily: 'Inter-Medium',
  },
  content: {
    flex: 1,
  },
  audioPlayer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter-Medium',
  },
  audioPlayerContainer: {
    marginTop: 8,
  },
  chapterContent: {
    padding: 20,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyContentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  emptyContentText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
  },
  completionContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  completionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  completedButton: {
    backgroundColor: '#f0fdf4',
  },
  completionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  completedText: {
    color: '#10b981',
  },
});