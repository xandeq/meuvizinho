import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { apiClient } from '../src/lib/api';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily } from '../src/theme/tokens';
import { apiErrorMessage } from '../src/lib/apiError';

export default function MagicLinkScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Informe seu e-mail');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/api/v1/auth/magic-link/request', { email: email.trim() });
      setSent(true);
    } catch (e: any) {
      Alert.alert('Erro', apiErrorMessage(e, 'Falha ao enviar link'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.fg }]}>Link enviado!</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
          Verifique seu e-mail para o link de acesso. O link expira em 15 minutos.
        </Text>
        <View style={{ height: 24 }} />
        <Button title="Voltar para login" icon="arrow-back" onPress={() => router.back()} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.fg }]}>Entrar sem senha</Text>
      <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
        Enviaremos um link de acesso para seu e-mail
      </Text>
      <View style={{ height: 24 }} />
      <Input
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="voce@exemplo.com"
        autoCapitalize="none"
      />
      <View style={{ height: 8 }} />
      <Button title="Enviar link" icon="mail" onPress={handleSend} loading={loading} />
      <View style={{ height: 16 }} />
      <Text
        onPress={() => router.back()}
        accessibilityRole="link"
        style={{ alignSelf: 'center', marginTop: 8, paddingVertical: 10, color: colors.primary, fontFamily: fontFamily.semibold, fontSize: 15 }}
      >
        Prefiro entrar com senha
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 28 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14, marginTop: 4, lineHeight: 20 },
});
