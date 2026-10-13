import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../src/components/Button';
import { useVerificationPolling } from '../src/lib/verification-polling';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily } from '../src/theme/tokens';

export default function Pending() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status, loading, error } = useVerificationPolling(true, 5000);

  useEffect(() => {
    if (status?.status === 'approved') {
      const t = setTimeout(() => router.replace('/feed'), 2000);
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
        <Text style={[styles.title, { color: colors.fg }]}>Erro</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>{error}</Text>
      </View>
    );
  }

  if (status?.status === 'approved') {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Ionicons name="checkmark-circle" size={64} color={colors.verified} />
        <Text style={[styles.title, { color: colors.fg }]}>Aprovado!</Text>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.title, { color: colors.fg }]}>Documento em análise</Text>
      <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
        Você receberá uma notificação assim que for aprovado.
      </Text>
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
  title: {
    fontFamily: fontFamily.extrabold,
    fontSize: 24,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
