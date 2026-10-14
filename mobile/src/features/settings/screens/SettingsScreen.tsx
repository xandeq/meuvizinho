import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { fontFamily, radius } from '../../../theme/tokens';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Escuro', icon: 'moon-outline' },
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { mode, setMode, colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Appearance section */}
      <Text style={[styles.sectionTitle, { color: colors.fg }]}>Aparência</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {THEME_OPTIONS.map((opt, i) => {
          const isActive = mode === opt.value;
          return (
            <Pressable accessibilityRole="button"
              key={opt.value}
              onPress={() => setMode(opt.value)}
              style={[
                styles.option,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                isActive && { backgroundColor: colors.primary + '14' },
              ]}
            >
              <View style={styles.optionLeft}>
                <Ionicons name={opt.icon} size={19} color={isActive ? colors.primary : colors.mutedFg} />
                <Text style={[styles.optionText, { color: colors.fg }]}>{opt.label}</Text>
              </View>
              {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>

      {/* Notifications section */}
      <Text style={[styles.sectionTitle, { color: colors.fg, marginTop: 24 }]}>Notificações</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable accessibilityRole="button" style={styles.option}>
          <View style={styles.optionLeft}>
            <Ionicons name="mail-outline" size={19} color={colors.mutedFg} />
            <Text style={[styles.optionText, { color: colors.fg }]}>Resumo semanal do bairro</Text>
          </View>
          <Text style={[styles.optionHint, { color: colors.mutedFg }]}>Em breve</Text>
        </Pressable>
      </View>

      {/* Premium link */}
      <Pressable accessibilityRole="button"
        onPress={() => router.push('/premium')}
        style={[styles.card, styles.lgpdLink, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}
      >
        <View style={styles.optionLeft}>
          <Ionicons name="star-outline" size={19} color={colors.accent} />
          <Text style={[styles.optionText, { color: colors.fg }]}>Meu Vizinho Premium</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedFg} />
      </Pressable>

      {/* LGPD link */}
      <Pressable accessibilityRole="button"
        onPress={() => router.push('/lgpd')}
        style={[styles.card, styles.lgpdLink, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}
      >
        <View style={styles.optionLeft}>
          <Ionicons name="document-text-outline" size={19} color={colors.mutedFg} />
          <Text style={[styles.optionText, { color: colors.fg }]}>Meus Dados (LGPD)</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedFg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 16, marginBottom: 8 },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionText: { fontFamily: fontFamily.medium, fontSize: 15 },
  optionHint: { fontFamily: fontFamily.regular, fontSize: 13 },
  lgpdLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
