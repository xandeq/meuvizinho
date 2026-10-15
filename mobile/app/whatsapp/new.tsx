import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/lib/auth-store';
import { submitWhatsAppGroup } from '../../src/lib/api/community';
import { WHATSAPP_KIND_LABELS, type WhatsAppGroupKind } from '../../src/lib/api/community.types';
import { Button } from '../../src/components/Button';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../src/theme/tokens';
import { goBackOr } from '../../src/lib/navigation';

const KINDS = Object.keys(WHATSAPP_KIND_LABELS) as WhatsAppGroupKind[];

export default function NewWhatsAppGroupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<WhatsAppGroupKind>('Bairro');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (name.trim().length < 3) {
      Alert.alert('Nome muito curto', 'Dê um nome claro para o grupo.');
      return;
    }
    if (!/^https:\/\/chat\.whatsapp\.com\//.test(inviteUrl.trim())) {
      Alert.alert('Link inválido', 'Cole o link de convite do WhatsApp (começa com https://chat.whatsapp.com/).');
      return;
    }
    if (!user?.bairroId) return;
    setSubmitting(true);
    try {
      await submitWhatsAppGroup({
        bairroId: user.bairroId,
        name: name.trim(),
        inviteUrl: inviteUrl.trim(),
        kind,
        description: description.trim() || undefined,
      });
      Alert.alert('Enviado', 'Seu grupo foi enviado para análise e aparecerá no diretório assim que for verificado.');
      goBackOr(router, '/whatsapp');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.error || 'Não foi possível enviar o grupo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: 20, paddingBottom: 80, gap: 16 }}>
      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Nome do grupo</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg, borderRadius: radius.sm }]}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Prédio Jardim das Flores"
          placeholderTextColor={colors.mutedFg}
        />
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Link de convite do WhatsApp</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg, borderRadius: radius.sm }]}
          value={inviteUrl}
          onChangeText={setInviteUrl}
          placeholder="https://chat.whatsapp.com/..."
          placeholderTextColor={colors.mutedFg}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Tipo</Text>
        <View style={styles.kindGrid}>
          {KINDS.map((k) => {
            const active = kind === k;
            return (
              <View key={k} style={styles.kindWrap}>
                <Button
                  title={WHATSAPP_KIND_LABELS[k]}
                  variant={active ? 'secondary' : 'outline'}
                  onPress={() => setKind(k)}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textarea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg, borderRadius: radius.sm }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Sobre o que é o grupo..."
          placeholderTextColor={colors.mutedFg}
          multiline
        />
      </View>

      <Button title="Enviar para análise" icon="logo-whatsapp" variant="secondary" onPress={handleSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontFamily: fontFamily.bold, fontSize: 14, marginBottom: 8 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 14 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  kindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindWrap: { minWidth: '47%', flexGrow: 1 },
});
