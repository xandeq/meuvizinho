import type { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/tokens';

interface Props {
  title: string;
  // Nome do bairro (ou contexto local) acima do título: cada aba "do seu bairro", não genérica.
  place?: string | null;
  actions?: ReactNode;
  // Telas das abas abertas por atalho (mapa, grupos) não tinham como voltar.
  onBack?: () => void;
}

export function ScreenHeader({ title, place, actions, onBack }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={12} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.fg} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        {place ? (
          <View style={styles.placeRow}>
            <Ionicons name="location" size={13} color={colors.primary} />
            <Text style={[styles.place, { color: colors.primary }]} numberOfLines={1}>{place}</Text>
          </View>
        ) : null}
        <Text style={[styles.title, { color: colors.fg }]} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
}

// Botão de ícone do cabeçalho: alvo de 44px (público 40+/60+), fundo suave em vez de ícone solto.
export function HeaderIconButton({ icon, label, onPress, badge }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={21} color={colors.fg} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.dangerFill, borderColor: colors.bg }]}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4, marginLeft: -6 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  titles: { flex: 1 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  place: { fontFamily: fontFamily.semibold, fontSize: 13 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 28, letterSpacing: -0.4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 11 },
});
