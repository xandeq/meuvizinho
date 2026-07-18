import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from '../../../lib/api';
import { useTheme } from '../../../theme/ThemeContext';
import { statusTitle, statusHint, type SubscriptionStatus } from '../premium-logic';

// Preencher via app.json extra quando o produto Kiwify existir
const CHECKOUT_URL = (Constants.expoConfig?.extra?.kiwifyCheckoutUrl as string) || '';

const BENEFITS = [
  { title: 'Selo Premium ⭐', desc: 'Badge exclusivo nos seus anúncios do marketplace.' },
  { title: 'Apoie o Meu Vizinho', desc: 'Sua assinatura mantém a plataforma no ar e sem anúncios de terceiros.' },
  { title: 'Destaque nos anúncios', desc: 'Em breve: seus anúncios com prioridade no bairro.' },
  { title: 'Alertas em primeira mão', desc: 'Em breve: notificações de segurança sem atraso.' },
];

export default function PremiumScreen() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<SubscriptionStatus>('/api/v1/subscription/status');
      setStatus(res.data);
    } catch {
      setMessage({ kind: 'err', text: 'Não foi possível carregar seu plano.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startTrial = async () => {
    setStarting(true);
    setMessage(null);
    try {
      await apiClient.post('/api/v1/subscription/trial');
      setMessage({ kind: 'ok', text: 'Trial de 14 dias ativado! Aproveite o Premium.' });
      await load();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage({ kind: 'err', text: err.response?.data?.error ?? 'Não foi possível ativar o trial.' });
    } finally {
      setStarting(false);
    }
  };

  const isPremium = status?.plan === 'premium';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Text style={styles.heroTitle}>Meu Vizinho Premium</Text>
        <Text style={styles.heroSub}>Mais destaque, mais alcance e mais recursos para você e seu bairro.</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
      ) : status && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.fg }]}>{statusTitle(status)}</Text>
          <Text style={[styles.cardSub, { color: colors.muted }]}>{statusHint(status)}</Text>
        </View>
      )}

      {message && (
        <View style={[styles.banner, { backgroundColor: message.kind === 'ok' ? '#ECFDF5' : '#FEF2F2' }]}>
          <Text style={{ color: message.kind === 'ok' ? '#059669' : '#DC2626', fontWeight: '600', fontSize: 13 }}>
            {message.text}
          </Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.fg, marginBottom: 12 }]}>O que está incluso</Text>
        {BENEFITS.map((b) => (
          <View key={b.title} style={styles.benefit}>
            <Text style={{ color: '#059669', fontWeight: '800', marginRight: 8 }}>✓</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.benefitTitle, { color: colors.fg }]}>{b.title}</Text>
              <Text style={[styles.benefitDesc, { color: colors.muted }]}>{b.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {!loading && status && !isPremium && (
        <View style={{ gap: 10 }}>
          {status.isEligibleForTrial && (
            <Pressable
              onPress={startTrial}
              disabled={starting}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: starting ? 0.6 : 1 }]}
            >
              <Text style={styles.btnText}>{starting ? 'Ativando…' : 'Ativar trial grátis de 14 dias'}</Text>
            </Pressable>
          )}
          {CHECKOUT_URL ? (
            <Pressable
              onPress={() => Linking.openURL(CHECKOUT_URL)}
              style={[styles.btn, styles.btnOutline, { borderColor: colors.primary }]}
            >
              <Text style={[styles.btnText, { color: colors.primary }]}>Assinar Premium</Text>
            </Pressable>
          ) : (
            !status.isEligibleForTrial && (
              <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>
                Assinatura em breve — aguarde novidades.
              </Text>
            )
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  hero: { borderRadius: 16, padding: 24 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  banner: { borderRadius: 10, padding: 12 },
  benefit: { flexDirection: 'row', marginBottom: 10 },
  benefitTitle: { fontSize: 14, fontWeight: '600' },
  benefitDesc: { fontSize: 13, lineHeight: 18 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 2 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
