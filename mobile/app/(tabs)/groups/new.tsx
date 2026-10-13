import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/auth-store';
import { createGroup } from '@/features/groups/groupsApi';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';

const CATEGORIES = ['Esportes', 'Animais', 'Pais', 'Segurança', 'Jardinagem', 'Negócios', 'Cultura', 'Outros'] as const;

export default function NewGroupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Outros');
  const [joinPolicy, setJoinPolicy] = useState<'Open' | 'Closed'>('Open');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (name.trim().length < 3) {
      Alert.alert('Erro', 'Nome deve ter pelo menos 3 caracteres');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Erro', 'Descrição deve ter pelo menos 10 caracteres');
      return;
    }
    if (!user?.bairroId) return;
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
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o grupo. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={[styles.title, { color: colors.fg }]}>Criar Grupo</Text>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Nome do grupo</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg, borderRadius: radius.sm }]}
          value={name}
          onChangeText={setName}
          maxLength={100}
          placeholder="Ex: Futebol da Vila"
          placeholderTextColor={colors.mutedFg}
        />
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Descrição</Text>
        <TextInput
          style={[styles.input, { height: 80, borderColor: colors.border, backgroundColor: colors.card, color: colors.fg, borderRadius: radius.sm }]}
          value={description}
          onChangeText={setDescription}
          maxLength={500}
          placeholder="Sobre o grupo..."
          placeholderTextColor={colors.mutedFg}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CATEGORIES.map((c) => {
              const isActive = category === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    isActive && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                  ]}
                >
                  <Text style={[styles.chipText, { color: colors.mutedFg }, isActive && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Tipo de entrada</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['Open', 'Closed'] as const).map((p) => {
            const isActive = joinPolicy === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setJoinPolicy(p)}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  isActive && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.mutedFg }, isActive && { color: '#fff' }]}>
                  {p === 'Open' ? 'Aberto' : 'Fechado'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        onPress={handleCreate}
        disabled={submitting}
        style={[
          styles.createBtn,
          shadow.emerald,
          { backgroundColor: colors.secondary, borderRadius: radius.md },
          submitting && { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
        ]}
      >
        {!submitting && <Ionicons name="people" size={18} color="#fff" style={{ marginRight: 8 }} />}
        <Text style={styles.createBtnText}>{submitting ? 'Criando...' : 'Criar Grupo'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: fontFamily.semibold, fontSize: 24 },
  label: { fontFamily: fontFamily.medium, fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fontFamily.regular, fontSize: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontFamily: fontFamily.regular, fontSize: 13 },
  createBtn: { flexDirection: 'row', paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 16 },
});
