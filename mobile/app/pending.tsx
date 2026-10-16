import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { authApi } from '../src/lib/api';
import { useAuthStore } from '../src/lib/auth-store';
import { refreshUserFromProfile } from '../src/lib/refreshUser';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../src/components/Button';
import { useVerificationPolling } from '../src/lib/verification-polling';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily } from '../src/theme/tokens';
import { StepIndicator } from '../src/components/StepIndicator';

export default function Pending() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status, loading, error } = useVerificationPolling(true, 5000);
  const logout = useAuthStore((s) => s.logout);
  // Antes não havia saída desta tela (nem trocar de conta) enquanto o documento era analisado.
  const switchAccount = async () => {
    try { await authApi.logout(); } catch { /* sai do aparelho mesmo sem rede */ }
    logout();
    router.replace('/login');
  };

  useEffect(() => {
    if (status?.status === 'approved') {
      // Atualiza o usuário antes de ir ao feed; senão o feed achava que ainda não era verificado.
      const t = setTimeout(() => {
        refreshUserFromProfile().catch(() => {}).finally(() => router.replace('/feed'));
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [status?.status, router]);

  if (loading && !status) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>Carregando status…</Text>
      </View>
    );
  }

  if (error && !status) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Ionicons name="alert-circle" size={64} color={colors.danger} />
        <Text style={[styles.title, { color: colors.fg }]}>Sem conexão com o servidor</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>{error}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>A tela tenta de novo sozinha.</Text>
        {/* Antes era um beco sem saída: só "Erro" + o texto em inglês. */}
        <Pressable onPress={switchAccount} accessibilityRole="button" hitSlop={10} style={styles.switch}>
          <Text style={[styles.switchText, { color: colors.primary }]}>Entrar com outra conta</Text>
        </Pressable>
      </View>
    );
  }

  if (status?.status === 'approved') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Ionicons name="checkmark-circle" size={64} color={colors.verified} />
        <Text style={[styles.title, { color: colors.fg }]}>Aprovado</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>Bem-vindo ao seu bairro.</Text>
      </View>
    );
  }

  if (status?.status === 'rejected') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Ionicons name="warning" size={64} color={colors.accent} />
        <Text style={[styles.title, { color: colors.fg }]}>Verificação rejeitada</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
          {status.rejectionReason ?? 'Por favor envie outro comprovante.'}
        </Text>
        <View style={{ height: 24 }} />
        <Button title="Enviar novamente" icon="refresh" onPress={() => router.replace('/proof-upload')} />
      </View>
    );
  }

  // Antes: o indicador de carregamento ficava em cima da barra de progresso.
  return (
    <View style={[styles.waitWrap, { backgroundColor: colors.bg }]}>
      <StepIndicator step={3} />
      <View style={styles.waitBody}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="hourglass-outline" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.fg }]}>Documento em análise</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
          Um moderador confere se o endereço do comprovante bate com o informado. Você recebe uma notificação quando terminar.
        </Text>
        <View style={[styles.note, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="refresh" size={16} color={colors.mutedFg} />
          <Text style={[styles.noteText, { color: colors.mutedFg }]}>Esta tela atualiza sozinha.</Text>
        </View>
      </View>
      <Pressable onPress={switchAccount} accessibilityRole="button" hitSlop={10} style={styles.switch}>
        <Text style={[styles.switchText, { color: colors.primary }]}>Entrar com outra conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitWrap: { flex: 1, padding: 24 },
  waitBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  noteText: { fontFamily: fontFamily.medium, fontSize: 13 },
  switch: { alignSelf: 'center', paddingVertical: 12 },
  switchText: { fontFamily: fontFamily.semibold, fontSize: 15 },
  title: {
    fontFamily: fontFamily.extrabold,
    fontSize: 24,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 320,
  },
});
