import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius } from '../theme/tokens';
import { Button } from './Button';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, actionIcon, onAction }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight, borderRadius: radius.xl }]}>
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.fg }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.mutedFg }]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button title={actionLabel} icon={actionIcon} onPress={onAction} variant="outline" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: fontFamily.semibold, fontSize: 16, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  action: { marginTop: 20 },
});
