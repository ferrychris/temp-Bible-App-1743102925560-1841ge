import { Image, ImageProps, Platform } from 'react-native';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  src: string;
  alt: string;
}

export function ImageOptimizer({ src, alt, style, ...props }: OptimizedImageProps) {
  // Add query parameters for Unsplash image optimization
  const optimizedSrc = src.includes('unsplash.com') 
    ? `${src}${src.includes('?') ? '&' : '?'}auto=format,compress&q=80`
    : src;

  return (
    <Image
      {...props}
      source={{ uri: optimizedSrc }}
      style={style}
      accessibilityLabel={alt}
      // Web-specific optimizations
      {...(Platform.OS === 'web' && {
        loading: 'lazy',
        decoding: 'async',
      })}
    />
  );
}