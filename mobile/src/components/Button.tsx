import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../theme/tokens';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon }: Props) {
  const { colors } = useTheme();
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const bg = isOutline ? 'transparent' : isSecondary ? colors.secondary : colors.primary;
  const textColor = isOutline ? colors.primary : '#FFFFFF';
  const elevationShadow = isOutline ? {} : isSecondary ? shadow.emerald : shadow.blue;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderRadius: radius.md },
        isOutline && { borderWidth: 2, borderColor: colors.primary },
        !isOutline && elevationShadow,
        (loading || disabled) && { opacity: 0.6 },
        pressed && !loading && !disabled && { transform: [{ scale: 0.97 }], opacity: 0.92 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={textColor} style={styles.icon} /> : null}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  icon: { marginRight: 8 },
  text: { fontFamily: fontFamily.semibold, fontSize: 16 },
});
