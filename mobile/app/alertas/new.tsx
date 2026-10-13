import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/lib/auth-store';
import { createSecurityAlert } from '../../src/lib/api/community';
import { SECURITY_ALERT_KIND_LABELS, type SecurityAlertKind } from '../../src/lib/api/community.types';
import { Button } from '../../src/components/Button';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../src/theme/tokens';

const KINDS: { code: SecurityAlertKind; icon: keyof typeof Ionicons.glyphMap }[] = [
  { code: 'Furto', icon: 'lock-open-outline' },
  { code: 'Suspeito', icon: 'eye-outline' },
  { code: 'Incendio', icon: 'flame-outline' },
  { code: 'Acidente', icon: 'car-outline' },
  { code: 'Outros', icon: 'alert-circle-outline' },
];

export default function NewAlertScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [kind, setKind] = useState<SecurityAlertKind | null>(null);
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!kind) {
      Alert.alert('Selecione o tipo', 'Escolha o tipo de ocorrência.');
      return;
    }
    if (description.trim().length < 5) {
      Alert.alert('Descrição muito curta', 'Descreva brevemente o que aconteceu.');
      return;
    }
    if (!user?.bairroId) return;
    setSubmitting(true);
    try {
      await createSecurityAlert({
        bairroId: user.bairroId,
        kind,
        description: description.trim(),
        locationDescription: locationDescription.trim() || undefined,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.error || 'Não foi possível enviar o alerta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: 20, paddingBottom: 80, gap: 16 }}>
      <View style={[styles.warnBanner, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '40' }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.danger} />
        <Text style={[styles.warnText, { color: colors.danger }]}>
          Use apenas para alertar sobre fatos reais. Em emergência, acione a polícia (190) antes de postar aqui.
        </Text>
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Tipo de ocorrência</Text>
        <View style={styles.kindGrid}>
          {KINDS.map((k) => {
            const active = kind === k.code;
            return (
              <View key={k.code} style={styles.kindWrap}>
                <Button
                  title={SECURITY_ALERT_KIND_LABELS[k.code]}
                  icon={k.icon}
                  variant={active ? 'danger' : 'outline'}
                  onPress={() => setKind(k.code)}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>O que aconteceu?</Text>
        <TextInput
          style={[styles.input, styles.textarea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg, borderRadius: radius.sm }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Descreva brevemente a ocorrência..."
          placeholderTextColor={colors.mutedFg}
          multiline
          maxLength={500}
        />
      </View>

      <View>
        <Text style={[styles.label, { color: colors.mutedFg }]}>Local (opcional)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg, borderRadius: radius.sm }]}
          value={locationDescription}
          onChangeText={setLocationDescription}
          placeholder="Ex: Rua das Flores, perto do nº 123"
          placeholderTextColor={colors.mutedFg}
        />
      </View>

      <Button title="Enviar alerta" icon="shield-outline" variant="danger" onPress={handleSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  warnBanner: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.sm, borderWidth: 1 },
  warnText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 17 },
  label: { fontFamily: fontFamily.bold, fontSize: 14, marginBottom: 8 },
  kindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindWrap: { minWidth: '47%', flexGrow: 1 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 14 },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
});
