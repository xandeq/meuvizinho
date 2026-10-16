import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { fontFamily, radius } from '../../../theme/tokens';
import { apiClient, authApi } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Escuro', icon: 'moon-outline' },
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { mode, setMode, colors } = useTheme();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const email = useAuthStore((s) => s.user?.email);
  const [leaving, setLeaving] = useState(false);
  // null = carregando/indisponível. O switch só aparece depois de saber o valor real do servidor.
  const [digestOn, setDigestOn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    apiClient
      .get<{ digestOptOut?: boolean }>('/api/v1/profile/me')
      .then(({ data }) => { if (alive) setDigestOn(!data.digestOptOut); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const toggleDigest = async (next: boolean) => {
    setDigestOn(next);
    try {
      await apiClient.patch('/api/v1/profile/me', { digestOptOut: !next });
    } catch {
      setDigestOn(!next);
      Alert.alert('Não foi possível salvar', 'Verifique sua conexão e tente de novo.');
    }
  };

  // Antes não havia "Sair" no app (só dentro do fluxo de exclusão LGPD).
  const confirmLogout = () => {
    Alert.alert('Sair da conta?', email ? `Você vai sair de ${email} neste aparelho.` : 'Você vai sair neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setLeaving(true);
          // Revoga a sessão no servidor; sem rede, sai do aparelho do mesmo jeito.
          try {
            await authApi.logout();
          } catch {}
          logout();
          // Limpa a pilha: sem isso a tela inicial ficava com 'voltar' para as Configurações.
          if (router.canDismiss()) router.dismissAll();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
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
        <View style={styles.option}>
          <View style={[styles.optionLeft, { flex: 1 }]}>
            <Ionicons name="mail-outline" size={19} color={colors.mutedFg} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionText, { color: colors.fg }]}>Resumo semanal do bairro</Text>
              <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>E-mail com as novidades da semana</Text>
            </View>
          </View>
          {digestOn === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={digestOn}
              onValueChange={toggleDigest}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
              accessibilityLabel="Receber resumo semanal do bairro por e-mail"
            />
          )}
        </View>
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

      {/* Conta */}
      <Text style={[styles.sectionTitle, { color: colors.fg, marginTop: 24 }]}>Conta</Text>
      <Pressable
        onPress={confirmLogout}
        disabled={leaving}
        accessibilityRole="button"
        accessibilityLabel="Sair da conta"
        style={({ pressed }) => [
          styles.card,
          styles.lgpdLink,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed || leaving ? 0.7 : 1 },
        ]}
      >
        <View style={[styles.optionLeft, styles.shrink]}>
          <Ionicons name="log-out-outline" size={19} color={colors.danger} />
          <View style={styles.shrink}>
            <Text style={[styles.optionText, { color: colors.danger }]}>Sair da conta</Text>
            {email ? (
              <Text style={[styles.optionHint, { color: colors.mutedFg }]} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
        </View>
        {leaving ? <ActivityIndicator size="small" color={colors.danger} /> : null}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  shrink: { flexShrink: 1 },
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
