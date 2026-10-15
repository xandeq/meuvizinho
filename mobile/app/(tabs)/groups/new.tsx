import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/auth-store';
import { createGroup } from '@/features/groups/groupsApi';
import { Button } from '../../../src/components/Button';
import { useKeyboardHeight } from '../../../src/lib/useKeyboardHeight';
import { apiErrorMessage } from '../../../src/lib/apiError';
import { goBackOr } from '../../../src/lib/navigation';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../../src/theme/tokens';

const CATEGORIES = ['Esportes', 'Animais', 'Pais', 'Segurança', 'Jardinagem', 'Negócios', 'Cultura', 'Outros'] as const;
const POLICIES = [
  { code: 'Open', label: 'Aberto', hint: 'Qualquer vizinho verificado entra na hora.' },
  { code: 'Closed', label: 'Fechado', hint: 'Você aprova cada pedido de entrada.' },
] as const;

// Antes: tela sem cabeçalho nem "voltar", categorias escondidas na rolagem lateral, erros em pop-up
// e tudo em verde (que no app é reservado para "verificado").
export default function NewGroupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Outros');
  const [joinPolicy, setJoinPolicy] = useState<'Open' | 'Closed'>('Open');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (name.trim().length < 3) return setError('O nome precisa ter pelo menos 3 caracteres.');
    if (description.trim().length < 10) return setError('Conte um pouco sobre o grupo (mínimo 10 caracteres).');
    if (!user?.bairroId) return setError('Confirme seu endereço para criar grupos no bairro.');
    setError(null);
    setSubmitting(true);
    try {
      const group = await createGroup({
        bairroId: user.bairroId,
        name: name.trim(),
        description: description.trim(),
        category,
        joinPolicy,
        scope: 'Bairro',
      });
      router.replace(`/groups/${group.id}`);
    } catch (e) {
      setError(apiErrorMessage(e, 'Não foi possível criar o grupo. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const chip = (active: boolean) => [
    styles.chip,
    { borderColor: active ? colors.primaryFill : colors.border, backgroundColor: active ? colors.primaryFill : colors.card },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => goBackOr(router, '/groups')}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={12}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={24} color={colors.fg} />
        </Pressable>
        <Text style={[styles.title, { color: colors.fg }]} accessibilityRole="header">Criar grupo</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 32 + Math.max(0, keyboardHeight - insets.bottom) }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={[styles.label, { color: colors.fg }]}>Nome do grupo</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg }]}
            value={name}
            onChangeText={(t) => { setName(t); setError(null); }}
            maxLength={100}
            placeholder="Ex.: Corrida da orla"
            placeholderTextColor={colors.mutedFg}
            accessibilityLabel="Nome do grupo"
          />
        </View>

        <View>
          <Text style={[styles.label, { color: colors.fg }]}>Sobre o grupo</Text>
          <TextInput
            style={[styles.input, styles.textarea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg }]}
            value={description}
            onChangeText={(t) => { setDescription(t); setError(null); }}
            maxLength={500}
            placeholder="Ex.: Corrida leve aos sábados às 7h, saindo do quiosque 5."
            placeholderTextColor={colors.mutedFg}
            accessibilityLabel="Sobre o grupo"
            multiline
            textAlignVertical="top"
          />
          <Text style={[styles.counter, { color: colors.mutedFg }]}>{description.length}/500</Text>
        </View>

        <View>
          <Text style={[styles.label, { color: colors.fg }]}>Categoria</Text>
          <View style={styles.wrap} accessibilityRole="radiogroup">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={chip(active)}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : colors.fg }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: colors.fg }]}>Quem pode entrar</Text>
          <View style={{ gap: 10 }} accessibilityRole="radiogroup">
            {POLICIES.map((p) => {
              const active = joinPolicy === p.code;
              return (
                <Pressable
                  key={p.code}
                  onPress={() => setJoinPolicy(p.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${p.label}. ${p.hint}`}
                  style={[
                    styles.policy,
                    { borderColor: active ? colors.primaryFill : colors.border, backgroundColor: active ? colors.primaryLight : colors.card },
                  ]}
                >
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.mutedFg} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.policyTitle, { color: colors.fg }]}>{p.label}</Text>
                    <Text style={[styles.policyHint, { color: colors.mutedFg }]}>{p.hint}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">{error}</Text>
        ) : null}

        <Button title="Criar grupo" icon="people-outline" onPress={handleCreate} loading={submitting} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.bold, fontSize: 22 },
  label: { fontFamily: fontFamily.semibold, fontSize: 15, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 15 },
  textarea: { minHeight: 100 },
  counter: { fontFamily: fontFamily.regular, fontSize: 12, textAlign: 'right', marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5 },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  policy: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5 },
  policyTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  policyHint: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 2 },
  error: { fontFamily: fontFamily.semibold, fontSize: 14 },
});
