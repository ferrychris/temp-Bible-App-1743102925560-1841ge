import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { BookOpen, MessageCircle, Award, Users, Heart, Flame, ChevronRight, Clock, BookMarked, Calendar } from 'lucide-react-native';
import { getDailyVerse, supabase, verifyConnection } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

type Book = Database['public']['Tables']['books']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];

interface BookWithProgress extends Book {
  progress: number;
  lastRead: string;
  lastChapterId?: string;
}

export default function HomeScreen() {
  const [dailyVerse, setDailyVerse] = useState<string | null>(null);
  const [currentBooks, setCurrentBooks] = useState<BookWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const isSingleBook = currentBooks.length === 1;

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await verifyConnection();
      if (response.success) {
        setConnectionStatus('connected');
        loadInitialData();
      } else {
        setConnectionStatus('error');
        setConnectionError(typeof response.error === 'string' ? response.error : response.error?.message);
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionError('Failed to verify database connection');
    }
  };

  const loadInitialData = async () => {
    await Promise.all([
      loadDailyVerse(),
      fetchCurrentBooks()
    ]);
  };

  const loadDailyVerse = async () => {
    const verse = await getDailyVerse();
    setDailyVerse(verse);
  };

  const fetchCurrentBooks = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch books with their chapters
      const { data: booksData, error } = await supabase
        .from('books')
        .select(`
          *,
          chapters (
            id,
            title,
            status,
            updated_at,
            order
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      const booksWithProgress = (booksData || []).map(book => {
        const chapters = book.chapters || [];
        const totalChapters = chapters.length;
        const completedChapters = chapters.filter(c => c.status === 'published').length;
        const progress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

        // Find the last updated chapter
        const lastChapter = [...chapters].sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];

        return {
          ...book,
          progress,
          lastRead: lastChapter?.updated_at ? '2 days ago' : 'Not started',
          lastChapterId: lastChapter?.id,
          chapters: undefined // Remove chapters from the object
        };
      });

      setCurrentBooks(booksWithProgress);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatVerse = (verse: string | null) => {
    if (!verse) return { text: '', reference: '' };
    const [text, reference] = verse.split('|').map(s => s.trim());
    return { text, reference };
  };

  const handleViewLibrary = () => {
    router.push('/books');
  };

  const handleBookPress = (bookId: string) => {
    router.push(`/books/${bookId}/chapters`);
  };

  const handleContinueReading = (book: BookWithProgress) => {
    if (book.lastChapterId) {
      // Navigate to the specific chapter
      router.push(`/books/${book.id}/chapters/${book.lastChapterId}`);
    } else {
      // If no chapter has been read, go to the book's chapters list
      router.push(`/books/${book.id}/chapters`);
    }
  };

  const { text: verseText, reference: verseReference } = formatVerse(dailyVerse);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80' }}
              style={styles.profileImage}
            />
            <View style={styles.welcomeSection}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.name}>Sam Gheriafi</Text>
              <Text style={styles.bio}>Founder | Just me</Text>
            </View>
          </View>

          <View style={styles.quoteCard}>
            <Text style={styles.quoteLabel}>Verse of the Day</Text>
            <Text style={styles.quote}>{verseText}</Text>
            <Text style={styles.quoteAuthor}>{verseReference}</Text>
          </View>
        </View>

        {/* Current Books Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Books</Text>
            <Pressable 
              style={styles.seeAllButton}
              onPress={handleViewLibrary}>
              <Text style={styles.seeAllText}>View Library</Text>
              <ChevronRight size={16} color="#6366f1" />
            </Pressable>
          </View>

          {isSingleBook ? (
            <Pressable 
              style={styles.singleBookCard}
              onPress={() => handleBookPress(currentBooks[0].id)}>
              <View style={styles.singleBookHeader}>
                <Image
                  source={{ uri: currentBooks[0].cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80' }}
                  style={styles.singleBookCover}
                />
                <View style={styles.singleBookInfo}>
                  <View>
                    <Text style={styles.singleBookTitle}>{currentBooks[0].title}</Text>
                    <Text style={styles.singleBookAuthor}>{currentBooks[0].author || 'Unknown Author'}</Text>
                  </View>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressTitle}>Your Progress</Text>
                      <Text style={styles.progressPercent}>{currentBooks[0].progress}%</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${currentBooks[0].progress}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </View>

              <Pressable 
                style={styles.continueButton}
                onPress={() => handleContinueReading(currentBooks[0])}>
                <Text style={styles.continueButtonText}>Continue Reading</Text>
                <ChevronRight size={20} color="#ffffff" />
              </Pressable>
            </Pressable>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.booksContainer}>
              {currentBooks.map((book) => (
                <Pressable
                  key={book.id}
                  style={styles.bookCard}
                  onPress={() => handleBookPress(book.id)}>
                  <Image
                    source={{ uri: book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80' }}
                    style={styles.bookCover}
                  />
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookAuthor}>{book.author || 'Unknown Author'}</Text>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${book.progress}%` }]} />
                      </View>
                      <Text style={styles.progressText}>{book.progress}% Complete</Text>
                    </View>
                    <View style={styles.bookMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={14} color="#64748b" />
                        <Text style={styles.metaText}>{book.lastRead}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
              <View style={[styles.bookCard, styles.newBookCard]}>
                <View style={styles.newBookContent}>
                  <BookOpen size={32} color="#6366f1" />
                  <Text style={styles.newBookText}>Add New Book</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Activity Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <MessageCircle size={24} color="#6366f1" />
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Discussions</Text>
          </View>
          <View style={styles.statCard}>
            <Award size={24} color="#6366f1" />
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Achievements</Text>
            <Pressable style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>View All</Text>
              <ChevronRight size={16} color="#6366f1" />
            </Pressable>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsContainer}>
            {[
              { title: 'Early Bird', desc: 'Read 5 chapters before 8 AM', color: '#818cf8' },
              { title: 'Bookworm', desc: 'Finished your first book', color: '#34d399' },
              { title: 'Social Reader', desc: 'Joined 3 reading groups', color: '#fbbf24' }
            ].map((achievement, index) => (
              <View key={index} style={styles.achievementCard}>
                <View style={[styles.achievementIcon, { backgroundColor: achievement.color }]}>
                  <Award size={32} color="#ffffff" />
                </View>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDesc}>{achievement.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Partners Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Partners Activity</Text>
            <Pressable style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>View All</Text>
              <ChevronRight size={16} color="#6366f1" />
            </Pressable>
          </View>
          <View style={styles.partnersCard}>
            <View style={styles.partnersHeader}>
              <Users size={24} color="#6366f1" />
              <Text style={styles.partnersCount}>12 Active Partners</Text>
            </View>
            <View style={styles.partnerStats}>
              <View style={styles.partnerStatItem}>
                <MessageCircle size={20} color="#6366f1" />
                <Text style={styles.partnerStatNumber}>18</Text>
                <Text style={styles.partnerStatLabel}>Comments</Text>
              </View>
              <View style={styles.partnerStatItem}>
                <Heart size={20} color="#6366f1" />
                <Text style={styles.partnerStatNumber}>24</Text>
                <Text style={styles.partnerStatLabel}>Likes</Text>
              </View>
              <View style={styles.partnerStatItem}>
                <Flame size={20} color="#6366f1" />
                <Text style={styles.partnerStatNumber}>8</Text>
                <Text style={styles.partnerStatLabel}>Streaks</Text>
              </View>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activePartnersContainer}>
              {[1, 2, 3, 4, 5].map((partner) => (
                <Image
                  key={partner}
                  source={{ uri: `https://i.pravatar.cc/40?img=${partner}` }}
                  style={styles.partnerAvatar}
                />
              ))}
              <View style={styles.morePartnersCircle}>
                <Text style={styles.morePartnersText}>+7</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  welcomeSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  bio: {
    fontSize: 14,
    color: '#64748b',
  },
  quoteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  quoteLabel: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 8,
  },
  quote: {
    fontSize: 16,
    color: '#1e293b',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'right',
  },
  statsSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    marginRight: 4,
  },
  booksContainer: {
    paddingRight: 20,
  },
  bookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: 280,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    overflow: 'hidden',
  },
  bookCover: {
    width: '100%',
    height: 140,
  },
  bookInfo: {
    padding: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 'auto',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    color: '#64748b',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
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
  bookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  newBookCard: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    width: 160,
  },
  newBookContent: {
    alignItems: 'center',
    padding: 20,
  },
  newBookText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  achievementsContainer: {
    paddingRight: 20,
  },
  achievementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  partnersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  partnersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  partnersCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  partnerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  partnerStatItem: {
    alignItems: 'center',
  },
  partnerStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  partnerStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  activePartnersContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  morePartnersCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePartnersText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  singleBookCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  singleBookHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  singleBookCover: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginRight: 16,
  },
  singleBookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  singleBookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  singleBookAuthor: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
});