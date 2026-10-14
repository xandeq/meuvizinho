import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../src/components/Button';
import { useAuthStore } from '../src/lib/auth-store';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily, shadow } from '../src/theme/tokens';

const VALUES: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }[] = [
  { icon: 'home-outline', title: 'Feed do bairro', sub: 'Avisos, dicas e eventos de quem mora perto' },
  { icon: 'business-outline', title: 'Seu condomínio', sub: 'Comunicados do síndico e reserva de áreas' },
  { icon: 'shield-outline', title: 'Alertas de segurança', sub: 'O bairro avisado na hora, confirmado por vizinhos' },
];

export default function Index() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { colors } = useTheme();

  // Imperative router.replace() here ran before the Root Layout finished mounting
  // (cold start with a persisted session) and crashed the app. <Redirect> waits.
  if (isAuthenticated) return <Redirect href="/feed" />;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <Image source={require('../assets/brand/icon.png')} style={[styles.logo, shadow.ambientMid]} />
      <Text style={[styles.title, { color: colors.fg }]}>Meu Vizinho</Text>
      <Text style={[styles.subtitle, { color: colors.mutedFg }]}>Seu bairro, conectado de verdade.</Text>
      <View style={[styles.trustRow, { backgroundColor: colors.verifiedGlow }]}>
        <Ionicons name="shield-checkmark" size={15} color={colors.verified} />
        <Text style={[styles.trustText, { color: colors.verified }]}>Comunidade com endereço verificado</Text>
      </View>
      {/* Mesma promessa da landing: o que a pessoa ganha, em 3 linhas. */}
      <View style={styles.values}>
        {VALUES.map((v) => (
          <View key={v.title} style={styles.valueRow}>
            <View style={[styles.valueIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={v.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.valueTitle, { color: colors.fg }]}>{v.title}</Text>
              <Text style={[styles.valueSub, { color: colors.mutedFg }]}>{v.sub}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ height: 28 }} />
      <Button title="Entrar" icon="log-in" onPress={() => router.push('/login')} />
      <View style={{ height: 12 }} />
      <Button title="Criar conta" icon="person-add" variant="outline" onPress={() => router.push('/register')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logo: { width: 80, height: 80, borderRadius: 20, alignSelf: 'center', marginBottom: 14 },
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
  values: { marginTop: 28, gap: 14 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  valueTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  valueSub: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 1 },
});
