import { useState } from 'react';
import { View, Pressable, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Camera, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

interface Props {
  value?: string | null;
  onChange?: (url: string | null) => void;
  size?: number;
}

export function ProfileImagePicker({ value, onChange, size = 100 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteOldProfilePicture = async (userId: string) => {
    try {
      // List all files in the user's folder
      const { data: files, error: listError } = await supabase.storage
        .from('profile-pictures')
        .list(userId);

      if (listError) throw listError;

      if (files && files.length > 0) {
        // Delete all existing files
        const filesToDelete = files.map(file => `${userId}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('profile-pictures')
          .remove(filesToDelete);

        if (deleteError) throw deleteError;
      }
    } catch (error) {
      console.error('Error deleting old profile picture:', error);
      // Don't throw the error - we want to continue with the upload even if deletion fails
    }
  };

  const pickImage = async () => {
    try {
      setError(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('Not authenticated');

        // Delete old profile picture first
        await deleteOldProfilePicture(user.id);

        // Upload new image
        const filePath = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, decode(result.assets[0].base64), {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(filePath);

        // Update user metadata
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            avatar_url: publicUrl,
            profile_picture_url: publicUrl
          }
        });

        if (updateError) throw updateError;

        onChange?.(publicUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      <Pressable 
        style={[styles.container, { width: size, height: size }]} 
        onPress={pickImage}
        disabled={uploading}>
        {value ? (
          <Image 
            source={{ uri: value }} 
            style={[styles.image, { width: size, height: size }]} 
            onError={() => setError('Failed to load image')}
          />
        ) : (
          <Camera size={size * 0.4} color="#6366f1" />
        )}
        
        {uploading ? (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="#ffffff" />
          </View>
        ) : (
          <View style={styles.uploadIcon}>
            <Upload size={16} color="#ffffff" />
          </View>
        )}
      </Pressable>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 9999,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    borderRadius: 9999,
  },
  uploadIcon: {
    position: 'absolute',
    right: '10%',
    bottom: '10%',
    backgroundColor: '#6366f1',
    borderRadius: 9999,
    padding: 6,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});