import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react-native';
import Slider from '@react-native-community/slider';

interface AudioPlayerProps {
  url: string;
  fileName?: string;
  onError?: (error: string) => void;
}

export function AudioPlayer({ url, fileName, onError }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    if (Platform.OS === 'web') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.removeEventListener('error', handleAudioError);
        audioRef.current = null;
      }
    } else {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    }
  };

  const handleAudioError = (e: Event) => {
    const errorMessage = 'Failed to load or play audio file';
    console.error('Audio error:', e);
    setError(errorMessage);
    onError?.(errorMessage);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!url) return;

    let mounted = true;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await cleanup();

        if (Platform.OS === 'web') {
          // Web implementation using HTML5 Audio
          const audio = new window.Audio();
          audioRef.current = audio;

          // Add all event listeners before setting source
          audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            const errorMessage = 'Failed to load or play audio file';
            setError(errorMessage);
            onError?.(errorMessage);
            setIsLoading(false);
          });

          audio.addEventListener('canplaythrough', () => {
            if (mounted) {
              setIsLoading(false);
            }
          });

          audio.addEventListener('loadedmetadata', () => {
            if (mounted) {
              setDuration(audio.duration * 1000);
            }
          });

          audio.addEventListener('timeupdate', () => {
            if (mounted) {
              setPosition(audio.currentTime * 1000);
            }
          });

          audio.addEventListener('ended', () => {
            if (mounted) {
              setIsPlaying(false);
              setPosition(0);
            }
          });

          audio.addEventListener('playing', () => {
            if (mounted) setIsPlaying(true);
          });

          audio.addEventListener('pause', () => {
            if (mounted) setIsPlaying(false);
          });

          // Set volume before loading
          audio.volume = volume;

          // Set source and handle loading
          try {
            audio.src = url;
            // Force load
            audio.load();
          } catch (err) {
            console.error('Error setting audio source:', err);
            const errorMessage = 'Invalid audio source';
            setError(errorMessage);
            onError?.(errorMessage);
            setIsLoading(false);
          }
        } else {
          // Native implementation using Expo AV
          const { sound, status } = await Audio.Sound.createAsync(
            { uri: url },
            { 
              shouldPlay: false,
              progressUpdateIntervalMillis: 100,
              volume: volume,
            },
            (status) => {
              if (!mounted) return;
              if (status.isLoaded) {
                setPosition(status.positionMillis);
                setIsPlaying(status.isPlaying);
                if (status.didJustFinish) {
                  setIsPlaying(false);
                  setPosition(0);
                }
              }
            }
          );

          soundRef.current = sound;

          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(0);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading audio:', err);
        const errorMessage = 'Failed to load audio file';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadAudio();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [url]);

  const handlePlayPause = async () => {
    if (isLoading) return;
    
    try {
      if (Platform.OS === 'web' && audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          if (position >= duration) {
            audioRef.current.currentTime = 0;
          }
          await audioRef.current.play();
        }
      } else if (soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          if (position >= duration) {
            await soundRef.current.setPositionAsync(0);
          }
          await soundRef.current.playAsync();
        }
      }
    } catch (err) {
      console.error('Error playing/pausing:', err);
      const errorMessage = 'Failed to play/pause audio';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleSeek = async (value: number) => {
    if (isLoading) return;
    try {
      if (Platform.OS === 'web' && audioRef.current) {
        audioRef.current.currentTime = value / 1000;
      } else if (soundRef.current) {
        await soundRef.current.setPositionAsync(value);
      }
    } catch (err) {
      console.error('Error seeking:', err);
      const errorMessage = 'Failed to seek audio';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleVolumeChange = async (value: number) => {
    if (isLoading) return;
    try {
      setVolume(value);
      if (Platform.OS === 'web' && audioRef.current) {
        audioRef.current.volume = value;
      } else if (soundRef.current) {
        await soundRef.current.setVolumeAsync(value);
      }
      if (value > 0) setIsMuted(false);
    } catch (err) {
      console.error('Error changing volume:', err);
      const errorMessage = 'Failed to change volume';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleMute = async () => {
    if (isLoading) return;
    try {
      const newVolume = isMuted ? volume : 0;
      if (Platform.OS === 'web' && audioRef.current) {
        audioRef.current.volume = newVolume;
      } else if (soundRef.current) {
        await soundRef.current.setVolumeAsync(newVolume);
      }
      setIsMuted(!isMuted);
    } catch (err) {
      console.error('Error toggling mute:', err);
      const errorMessage = 'Failed to toggle mute';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    if (!url) return;
    setError(null);
    setIsLoading(true);
    // Re-mount effect will handle reloading
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={handleRetry}>
          <RotateCcw size={16} color="#6366f1" />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {fileName && (
        <Text style={styles.fileName} numberOfLines={1}>
          {fileName}
        </Text>
      )}

      <View style={styles.controls}>
        <Pressable
          style={[styles.playButton, isLoading && styles.playButtonDisabled]}
          onPress={handlePlayPause}
          disabled={isLoading}>
          {isLoading ? (
            <View style={styles.loadingIndicator} />
          ) : isPlaying ? (
            <Pause size={24} color="#ffffff" />
          ) : (
            <Play size={24} color="#ffffff" />
          )}
        </Pressable>

        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressBar}
            minimumValue={0}
            maximumValue={duration}
            value={position}
            onSlidingComplete={handleSeek}
            minimumTrackTintColor="#6366f1"
            maximumTrackTintColor="#e2e8f0"
            thumbTintColor="#6366f1"
            disabled={isLoading}
            accessibilityLabel="Progress slider"
          />
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <View style={styles.volumeContainer}>
          <Pressable 
            style={styles.muteButton} 
            onPress={handleMute}
            disabled={isLoading}>
            {isMuted ? (
              <VolumeX size={20} color="#64748b" />
            ) : (
              <Volume2 size={20} color="#64748b" />
            )}
          </Pressable>
          <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={isMuted ? 0 : volume}
            onSlidingComplete={handleVolumeChange}
            minimumTrackTintColor="#6366f1"
            maximumTrackTintColor="#e2e8f0"
            thumbTintColor="#6366f1"
            disabled={isLoading}
            accessibilityLabel="Volume slider"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  fileName: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 12,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  loadingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderTopColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
  },
  muteButton: {
    padding: 4,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  retryText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
});