import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { cepApi } from '../src/lib/api';
import { useOnboardingStore } from '../src/lib/onboarding-store';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../src/theme/tokens';
import type { CepLookupResult } from '@bairronow/shared-types';
import { StepIndicator } from '../src/components/StepIndicator';

export default function CepLookup() {
  const router = useRouter();
  const setAddress = useOnboardingStore((s) => s.setAddress);
  const { colors } = useTheme();
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setLocalAddress] = useState<CepLookupResult | null>(null);

  const lookup = async () => {
    setLoading(true);
    try {
      const a = await cepApi.lookup(cep);
      setLocalAddress(a);
      setAddress(a);
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message ?? e?.message ?? 'CEP não encontrado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <StepIndicator step={1} />
      <Text style={[styles.title, { color: colors.fg }]}>Seu endereço</Text>
      <Text style={[styles.subtitle, { color: colors.mutedFg }]}>Para conectar você ao seu bairro</Text>
      <View style={{ height: 24 }} />
      <Input
        label="CEP"
        value={cep}
        onChangeText={setCep}
        placeholder="00000-000"
        keyboardType="numeric"
      />
      <Button title="Buscar" icon="search" onPress={lookup} loading={loading} />
      {address && (
        <View style={[styles.card, shadow.ambientLow, { backgroundColor: colors.card, borderRadius: radius.md }]}>
          <Text style={[styles.cardTitle, { color: colors.fg }]}>{address.logradouro}</Text>
          <Text style={[styles.cardLine, { color: colors.mutedFg }]}>
            {address.bairro} • {address.localidade}/{address.uf}
          </Text>
          {address.bairroId == null && (
            <Text style={[styles.warning, { color: colors.accent }]}>Ainda não atendemos este bairro.</Text>
          )}
          <View style={{ height: 16 }} />
          <Button
            title="Confirmar e continuar"
            icon="arrow-forward"
            onPress={() => router.push('/proof-upload')}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 28 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14, marginTop: 4 },
  card: { marginTop: 24, padding: 20 },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: 18 },
  cardLine: { fontFamily: fontFamily.regular, fontSize: 14, marginTop: 4 },
  warning: { marginTop: 12, fontFamily: fontFamily.semibold, fontSize: 13 },
});
