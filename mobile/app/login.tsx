import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, Link } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { loginSchema, type LoginInput } from '@bairronow/shared-validators';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { authApi, apiClient } from '../src/lib/api';
import { useAuthStore } from '../src/lib/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../src/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  (Constants.expoConfig?.extra?.googleClientId as string) || '';

export default function Login() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [totpGate, setTotpGate] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Google OAuth via expo-auth-session
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        handleGoogleLogin(idToken);
      }
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const { data } = await apiClient.post<{ accessToken: string; user: any }>(
        '/api/v1/auth/google/mobile',
        { idToken },
      );
      login(data.accessToken, data.user);
      router.replace('/feed');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Falha ao entrar com Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      // Check for TOTP gate
      if ((res as any).requiresTotp) {
        setTotpGate(true);
        setTempToken((res as any).tempToken || '');
        return;
      }
      login(res.accessToken, res.user);
      router.replace('/feed');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async () => {
    setTotpLoading(true);
    try {
      const { data } = await apiClient.post<{ accessToken: string; user: any }>(
        '/api/v1/auth/login/totp-verify',
        { tempToken, code: totpCode },
      );
      login(data.accessToken, data.user);
      router.replace('/feed');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Código inválido');
    } finally {
      setTotpLoading(false);
    }
  };

  if (totpGate) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.fg }]}>Verificação em duas etapas</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
          Digite o código do seu aplicativo autenticador
        </Text>
        <View style={{ height: 24 }} />
        <TextInput
          style={[styles.totpInput, { color: colors.fg, borderColor: colors.border }]}
          value={totpCode}
          onChangeText={setTotpCode}
          placeholder="000000"
          placeholderTextColor={colors.mutedFg}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />
        <View style={{ height: 16 }} />
        <Button title="Verificar" icon="shield-checkmark" onPress={handleTotpVerify} loading={totpLoading} />
        <View style={{ height: 12 }} />
        <Pressable onPress={() => { setTotpGate(false); setTotpCode(''); }}>
          <Text style={[styles.link, { color: colors.primary }]}>Voltar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.fg }]}>Entrar</Text>
      <Text style={[styles.subtitle, { color: colors.mutedFg }]}>Acesse seu bairro</Text>
      <View style={{ height: 24 }} />

      {/* Google Sign-In */}
      <Pressable
        onPress={() => promptAsync()}
        disabled={!request || googleLoading}
        style={({ pressed }) => [
          styles.googleButton,
          { borderRadius: radius.md },
          (googleLoading || !request) && { opacity: 0.6 },
          pressed && !googleLoading && { transform: [{ scale: 0.97 }] },
        ]}
      >
        <Ionicons name="logo-google" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.googleText}>
          {googleLoading ? 'Entrando...' : 'Entrar com Google'}
        </Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.mutedFg }]}>ou</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            label="E-mail"
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            placeholder="voce@exemplo.com"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Senha"
            value={value}
            onChangeText={onChange}
            secureTextEntry
            placeholder="********"
            error={errors.password?.message}
          />
        )}
      />
      <Button title="Entrar" icon="log-in" onPress={handleSubmit(onSubmit)} loading={loading} />
      <View style={{ height: 12 }} />
      <Link href="/magic-link" style={[styles.link, { color: colors.primary }]}>
        Entrar sem senha (link magico)
      </Link>
      <View style={{ height: 16 }} />
      <Link href="/register" style={[styles.link, { color: colors.primary }]}>
        Nao tem conta? Criar conta
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 28 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14, marginTop: 4 },
  link: { textAlign: 'center', fontFamily: fontFamily.semibold },
  googleButton: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    ...shadow.ambientMid,
  },
  googleText: { color: '#fff', fontFamily: fontFamily.semibold, fontSize: 16 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontFamily: fontFamily.regular, fontSize: 13 },
  totpInput: {
    height: 56,
    borderWidth: 2,
    borderRadius: radius.sm,
    fontFamily: fontFamily.bold,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
  },
});
