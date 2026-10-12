import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../src/lib/auth-store';
import { apiClient } from '../src/lib/api';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily } from '../src/theme/tokens';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const login = useAuthStore((s) => s.login);
  const { colors } = useTheme();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token ausente');
      return;
    }

    (async () => {
      try {
        // Verify the magic link token with the backend
        const { data } = await apiClient.get<{ accessToken: string; user: any }>(
          `/api/v1/auth/magic-link/verify?token=${encodeURIComponent(token)}`,
        );
        login(data.accessToken, data.user);
        router.replace('/feed');
      } catch (e: any) {
        const msg = e?.response?.data?.error || 'Link invalido ou expirado';
        setError(msg);
        Alert.alert('Erro', msg);
      }
    })();
  }, [token]);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        <Text
          style={[styles.link, { color: colors.primary }]}
          onPress={() => router.replace('/login')}
        >
          Voltar para login
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedFg, fontFamily: fontFamily.regular }]}>Autenticando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { marginTop: 16, fontSize: 16 },
  errorText: { fontFamily: fontFamily.semibold, fontSize: 16, marginBottom: 16, textAlign: 'center' },
  link: { fontFamily: fontFamily.semibold, fontSize: 16 },
});
