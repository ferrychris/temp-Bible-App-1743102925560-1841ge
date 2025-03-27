import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';

export default function PartnersScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Partners</Text>
      </View>

      <View style={styles.feed}>
        {[1, 2, 3].map((post) => (
          <View key={post} style={styles.post}>
            <View style={styles.postHeader}>
              <Image
                source={{
                  uri: `https://i.pravatar.cc/40?img=${post}`,
                }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.userName}>User Name</Text>
                <Text style={styles.timestamp}>2 hours ago</Text>
              </View>
            </View>

            <Text style={styles.postContent}>
              Just finished Chapter {post}! Here are my thoughts on the amazing
              insights shared about personal growth and development...
            </Text>

            <View style={styles.postActions}>
              <Pressable style={styles.actionButton}>
                <Heart size={20} color="#6366f1" />
                <Text style={styles.actionText}>24</Text>
              </Pressable>
              <Pressable style={styles.actionButton}>
                <MessageCircle size={20} color="#6366f1" />
                <Text style={styles.actionText}>12</Text>
              </Pressable>
            </View>

            <View style={styles.comments}>
              <View style={styles.comment}>
                <Image
                  source={{
                    uri: `https://i.pravatar.cc/30?img=${post + 3}`,
                  }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUserName}>Jane Doe</Text>
                  <Text style={styles.commentText}>
                    Totally agree! The insights about mindfulness really resonated
                    with me.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  feed: {
    padding: 20,
  },
  post: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
  },
  postContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 15,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 15,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 14,
    color: '#64748b',
  },
  comments: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  comment: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 8,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#334155',
  },
});