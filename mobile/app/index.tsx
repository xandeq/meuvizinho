import { View, Text, Image, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../src/components/Button';
import { useAuthStore } from '../src/lib/auth-store';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily, shadow } from '../src/theme/tokens';

export default function Index() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { colors } = useTheme();

  // Imperative router.replace() here ran before the Root Layout finished mounting
  // (cold start with a persisted session) and crashed the app. <Redirect> waits.
  if (isAuthenticated) return <Redirect href="/feed" />;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Image source={require('../assets/brand/icon.png')} style={[styles.logo, shadow.ambientMid]} />
      <Text style={[styles.title, { color: colors.fg }]}>Meu Vizinho</Text>
      <Text style={[styles.subtitle, { color: colors.mutedFg }]}>Seu bairro, conectado de verdade.</Text>
      <View style={[styles.trustRow, { backgroundColor: colors.verifiedGlow }]}>
        <Ionicons name="shield-checkmark" size={15} color={colors.verified} />
        <Text style={[styles.trustText, { color: colors.verified }]}>Comunidade com endereço verificado</Text>
      </View>
      <View style={{ height: 32 }} />
      <Button title="Entrar" icon="log-in" onPress={() => router.push('/login')} />
      <View style={{ height: 12 }} />
      <Button title="Criar conta" icon="person-add" variant="outline" onPress={() => router.push('/register')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { width: 96, height: 96, borderRadius: 24, alignSelf: 'center', marginBottom: 16 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 36, textAlign: 'center' },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 16, textAlign: 'center', marginTop: 4 },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 24,
  },
  trustText: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
