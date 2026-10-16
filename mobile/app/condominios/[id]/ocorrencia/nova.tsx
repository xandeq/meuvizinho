import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createIncident } from '../../../../src/lib/api/condo';
import { INCIDENT_CATEGORIES, type IncidentCategory } from '../../../../src/lib/api/condo.types';
import { Button } from '../../../../src/components/Button';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../../../src/theme/tokens';
import { apiErrorMessage } from '../../../../src/lib/apiError';
import { useKeyboardHeight } from '../../../../src/lib/useKeyboardHeight';

const TITLE_MIN = 4;
const DESCRIPTION_MIN = 10;

export default function NovaOcorrenciaScreen() {
  const { colors } = useTheme();
  // Teclado cobria o fim do formulário (botão de enviar) no Android edge-to-edge.
  const keyboardHeight = useKeyboardHeight();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const condoId = Number(id);

  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!category) return setError('Escolha o assunto da ocorrência.');
    if (title.trim().length < TITLE_MIN) return setError('Dê um título curto, como "Lâmpada queimada no hall".');
    if (description.trim().length < DESCRIPTION_MIN) return setError('Conte um pouco mais: o que aconteceu e desde quando.');
    setError(null);
    setSending(true);
    try {
      const created = await createIncident(condoId, {
        category,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
      });
      router.replace(`/condominios/${condoId}/ocorrencia/${created.id}`);
    } catch (e: any) {
      setError(apiErrorMessage(e, 'Não foi possível enviar. Tente de novo.'));
    } finally {
      setSending(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg }];

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingBottom: 80 + keyboardHeight }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.lead, { color: colors.mutedFg }]}>
        O síndico recebe e responde por aqui. Você acompanha cada etapa até resolver.
      </Text>

      <Text style={[styles.label, { color: colors.fg }]}>Assunto</Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {INCIDENT_CATEGORIES.map((c) => {
          const active = category === c.code;
          return (
            <Pressable
              key={c.code}
              onPress={() => {
                setCategory(c.code);
                setError(null);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={c.label}
              style={({ pressed }) => [
                styles.cat,
                {
                  backgroundColor: active ? colors.primaryLight : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={22} color={active ? colors.primary : colors.mutedFg} />
              <Text style={[styles.catText, { color: active ? colors.primary : colors.fg }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.fg }]}>Título</Text>
      <TextInput
        style={inputStyle}
        value={title}
        onChangeText={(t) => setTitle(t.slice(0, 120))}
        placeholder="Ex: Lâmpada queimada no hall"
        placeholderTextColor={colors.mutedFg}
        maxLength={120}
        accessibilityLabel="Título da ocorrência"
      />

      <Text style={[styles.label, { color: colors.fg }]}>O que aconteceu</Text>
      <TextInput
        style={[inputStyle, styles.textarea]}
        value={description}
        onChangeText={(t) => setDescription(t.slice(0, 2000))}
        placeholder="Descreva o problema e desde quando ele acontece."
        placeholderTextColor={colors.mutedFg}
        multiline
        maxLength={2000}
        accessibilityLabel="Descrição da ocorrência"
      />

      <Text style={[styles.label, { color: colors.fg }]}>
        Onde <Text style={{ color: colors.mutedFg, fontFamily: fontFamily.regular }}>(opcional)</Text>
      </Text>
      <TextInput
        style={inputStyle}
        value={location}
        onChangeText={(t) => setLocation(t.slice(0, 120))}
        placeholder="Ex: Garagem, vaga 12"
        placeholderTextColor={colors.mutedFg}
        maxLength={120}
        accessibilityLabel="Local da ocorrência"
      />

      {error && (
        <View style={[styles.error, { backgroundColor: colors.danger + '12' }]} accessibilityLiveRegion="assertive">
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <View style={{ marginTop: 20 }}>
        <Button title="Enviar ao síndico" icon="send-outline" onPress={submit} loading={sending} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80 },
  lead: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  label: { fontFamily: fontFamily.semibold, fontSize: 14, marginTop: 18, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    width: '31.8%',
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  catText: { fontFamily: fontFamily.semibold, fontSize: 12.5, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 15 },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.sm, marginTop: 16 },
  errorText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13 },
});
