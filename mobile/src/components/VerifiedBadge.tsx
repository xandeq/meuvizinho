import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius } from '../theme/tokens';

interface Props {
  verified: boolean;
  compact?: boolean;
}

/**
 * Selo de verificação — componente assinatura do produto (DESIGN.md §5).
 * colors.verified é reservado: nunca reutilizar fora deste contexto de confiança.
 */
export function VerifiedBadge({ verified, compact = false }: Props) {
  const { colors } = useTheme();

  if (!verified) {
    return (
      <View style={[styles.base, { backgroundColor: colors.muted, borderRadius: radius.xl }]}>
        <Ionicons name="help-circle-outline" size={compact ? 12 : 14} color={colors.mutedFg} />
        {compact ? null : <Text style={[styles.text, { color: colors.mutedFg }]}>Não verificado</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.base, { backgroundColor: colors.verifiedGlow, borderRadius: radius.xl }]}>
      <Ionicons name="checkmark-circle" size={compact ? 12 : 14} color={colors.verified} />
      {compact ? null : <Text style={[styles.text, { color: colors.verified }]}>Verificado</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
