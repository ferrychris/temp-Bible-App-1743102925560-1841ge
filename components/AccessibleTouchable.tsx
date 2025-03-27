import { Platform, Pressable, PressableProps } from 'react-native';

interface AccessibleTouchableProps extends PressableProps {
  accessibilityLabel: string;
}

export function AccessibleTouchable({
  accessibilityLabel,
  children,
  ...props
}: AccessibleTouchableProps) {
  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessible={true}
      style={({ pressed }) => [
        props.style,
        Platform.OS === 'web' 
          ? { cursor: 'pointer' } 
          : pressed 
            ? { opacity: 0.7 } 
            : undefined
      ]}>
      {children}
    </Pressable>
  );
}