import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/lib/auth-store';
import { createSecurityAlert } from '../../src/lib/api/community';
import { SECURITY_ALERT_KIND_LABELS, type SecurityAlertKind } from '../../src/lib/api/community.types';
import { Button } from '../../src/components/Button';
import { useKeyboardHeight } from '../../src/lib/useKeyboardHeight';
import { apiErrorMessage } from '../../src/lib/apiError';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../src/theme/tokens';
import { goBackOr } from '../../src/lib/navigation';

const KINDS: { code: SecurityAlertKind; icon: keyof typeof Ionicons.glyphMap }[] = [
  { code: 'Furto', icon: 'lock-open-outline' },
  { code: 'Suspeito', icon: 'eye-outline' },
  { code: 'Incendio', icon: 'flame-outline' },
  { code: 'Acidente', icon: 'car-outline' },
  { code: 'Outros', icon: 'alert-circle-outline' },
];
const MAX = 500;

// Antes: 5 botões grandes contornados (pareciam todos selecionados, grade 1-1-2-1),
// erros em pop-up e o campo de local ficava atrás do teclado.
export default function NewAlertScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const user = useAuthStore((s) => s.user);
  const [kind, setKind] = useState<SecurityAlertKind | null>(null);
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!kind) return setError('Escolha o tipo de ocorrência.');
    if (description.trim().length < 5) return setError('Descreva brevemente o que aconteceu (mínimo 5 caracteres).');
    if (!user?.bairroId) return setError('Confirme seu endereço para enviar alertas no bairro.');
    setError(null);
    setSubmitting(true);
    try {
      await createSecurityAlert({
        bairroId: user.bairroId,
        kind,
        description: description.trim(),
        locationDescription: locationDescription.trim() || undefined,
      });
      goBackOr(router, '/(tabs)/alertas');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível enviar o alerta.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 + Math.max(0, keyboardHeight - insets.bottom), gap: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.warnBanner, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '40' }]}>
        <Ionicons name="call-outline" size={18} color={colors.danger} />
        <Text style={[styles.warnText, { color: colors.fg }]}>
          Em emergência, ligue <Text style={{ fontFamily: fontFamily.bold, color: colors.danger }}>190</Text> antes de postar. Use só para fatos reais.
        </Text>
      </View>

      <View>
        <Text style={[styles.label, { color: colors.fg }]}>Tipo de ocorrência</Text>
        <View style={styles.kindGrid} accessibilityRole="radiogroup">
          {KINDS.map((k) => {
            const active = kind === k.code;
            return (
              <Pressable
                key={k.code}
                onPress={() => { setKind(k.code); setError(null); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={SECURITY_ALERT_KIND_LABELS[k.code]}
                style={({ pressed }) => [
                  styles.kind,
                  {
                    backgroundColor: active ? colors.danger : colors.card,
                    borderColor: active ? colors.danger : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name={k.icon} size={24} color={active ? '#fff' : colors.danger} />
                <Text style={[styles.kindText, { color: active ? '#fff' : colors.fg }]} numberOfLines={2}>
                  {SECURITY_ALERT_KIND_LABELS[k.code]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.label, { color: colors.fg }]}>O que aconteceu?</Text>
        <TextInput
          style={[styles.input, styles.textarea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg }]}
          value={description}
          onChangeText={(t) => { setDescription(t.slice(0, MAX)); setError(null); }}
          placeholder="Ex.: carro estranho parado há 1 hora em frente à escola"
          placeholderTextColor={colors.mutedFg}
          accessibilityLabel="O que aconteceu?"
          multiline
          maxLength={MAX}
        />
        <Text style={[styles.counter, { color: colors.mutedFg }]}>{description.length}/{MAX}</Text>
      </View>

      <View>
        <Text style={[styles.label, { color: colors.fg }]}>
          Local <Text style={{ color: colors.mutedFg, fontFamily: fontFamily.regular }}>(opcional)</Text>
        </Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg }]}
          value={locationDescription}
          onChangeText={setLocationDescription}
          placeholder="Ex.: Rua das Flores, perto do nº 123"
          placeholderTextColor={colors.mutedFg}
          accessibilityLabel="Local, opcional"
          maxLength={200}
        />
        <Text style={[styles.hint, { color: colors.mutedFg }]}>Evite o número exato de casas e apartamentos.</Text>
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">{error}</Text>
      ) : null}

      <Button title="Enviar alerta" icon="shield-outline" variant="danger" onPress={handleSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  warnBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1 },
  warnText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fontFamily.semibold, fontSize: 15, marginBottom: 10 },
  kindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kind: { width: '31%', flexGrow: 1, minHeight: 84, borderWidth: 1.5, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 10 },
  kindText: { fontFamily: fontFamily.semibold, fontSize: 13, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 15 },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  counter: { fontFamily: fontFamily.regular, fontSize: 12, textAlign: 'right', marginTop: 4 },
  hint: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 6 },
  error: { fontFamily: fontFamily.semibold, fontSize: 14 },
});
