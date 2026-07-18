import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../theme/ThemeContext';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

export default function SettingsScreen() {
  const { mode, setMode, colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Appearance section */}
      <Text style={[styles.sectionTitle, { color: colors.fg }]}>Aparencia</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {THEME_OPTIONS.map((opt) => {
          const isActive = mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setMode(opt.value)}
              style={[
                styles.option,
                isActive && { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Text style={[styles.optionText, { color: colors.fg }]}>{opt.label}</Text>
              {isActive && (
                <View style={[styles.checkDot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Notifications section */}
      <Text style={[styles.sectionTitle, { color: colors.fg, marginTop: 24 }]}>Notificacoes</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable style={styles.option}>
          <Text style={[styles.optionText, { color: colors.fg }]}>Resumo semanal do bairro</Text>
          <Text style={[styles.optionHint, { color: colors.muted }]}>Em breve</Text>
        </Pressable>
      </View>

      {/* Premium link */}
      <Pressable
        onPress={() => router.push('/premium')}
        style={[styles.card, styles.lgpdLink, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}
      >
        <Text style={[styles.optionText, { color: colors.fg }]}>Meu Vizinho Premium</Text>
        <Text style={{ color: colors.muted, fontSize: 18 }}>{'>'}</Text>
      </Pressable>

      {/* LGPD link */}
      <Pressable
        onPress={() => router.push('/lgpd')}
        style={[styles.card, styles.lgpdLink, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}
      >
        <Text style={[styles.optionText, { color: colors.fg }]}>Meus Dados (LGPD)</Text>
        <Text style={{ color: colors.muted, fontSize: 18 }}>{'>'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  card: {
    borderRadius: 12,
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
  optionText: { fontSize: 15, fontWeight: '500' },
  optionHint: { fontSize: 13 },
  checkDot: { width: 12, height: 12, borderRadius: 6 },
  lgpdLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
