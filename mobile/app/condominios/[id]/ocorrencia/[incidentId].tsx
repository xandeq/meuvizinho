import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getIncident, updateIncidentStatus } from '../../../../src/lib/api/condo';
import { getCondominium } from '../../../../src/lib/api/community';
import { INCIDENT_STATUS_LABELS, type IncidentDto, type IncidentStatus } from '../../../../src/lib/api/condo.types';
import { categoryMeta, statusTone, timelineSteps, relativeDate, STATUS_ICON } from '../../../../src/features/condominium/incident-ui';
import { formatDayMonth, formatTime } from '../../../../src/features/condominium/reservation-slots';
import { useAuthStore } from '../../../../src/lib/auth-store';
import { Button } from '../../../../src/components/Button';
import { EmptyState } from '../../../../src/components/EmptyState';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../../src/theme/tokens';
import { apiErrorMessage } from '../../../../src/lib/apiError';

const STEP_HINT: Record<IncidentStatus, string> = {
  Aberta: 'Enviada ao síndico',
  EmAndamento: 'Síndico está cuidando',
  Resolvida: 'Problema resolvido',
  Recusada: 'Síndico não vai atender',
};

export default function OcorrenciaDetalheScreen() {
  const { colors } = useTheme();
  const { id, incidentId } = useLocalSearchParams<{ id: string; incidentId: string }>();
  const condoId = Number(id);
  const isAdmin = useAuthStore((s) => !!s.user?.isAdmin);

  const [item, setItem] = useState<IncidentDto | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<IncidentStatus | null>(null);

  const load = useCallback(() => {
    Promise.all([getIncident(condoId, Number(incidentId)), getCondominium(condoId)])
      .then(([i, c]) => {
        setItem(i);
        setCanManage(c.isMySindico || isAdmin);
      })
      .catch((e: any) =>
        setError(e?.response?.status === 404 ? 'Ocorrência não encontrada.' : 'Não foi possível abrir a ocorrência.')
      );
  }, [condoId, incidentId, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (status: IncidentStatus) => {
    if (status === 'Recusada' && note.trim().length === 0) {
      Alert.alert('Explique o motivo', 'Escreva para o morador por que a ocorrência não será atendida.');
      return;
    }
    setSaving(status);
    try {
      setItem(await updateIncidentStatus(condoId, Number(incidentId), { status, responseNote: note.trim() || undefined }));
      setNote('');
    } catch (e: any) {
      Alert.alert('Erro', apiErrorMessage(e, 'Não foi possível atualizar.'));
    } finally {
      setSaving(null);
    }
  };

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <EmptyState icon="document-outline" title={error} />
      </View>
    );
  }
  if (!item) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const cat = categoryMeta(item.category);
  const tone = colors[statusTone(item.status)];
  const closed = item.status === 'Resolvida' || item.status === 'Recusada';
  const steps = timelineSteps(item.status);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, shadow.ambientLow, { backgroundColor: colors.card }]}>
        <View style={styles.heroTop}>
          <View style={[styles.catTile, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={cat.icon} size={22} color={colors.primary} />
          </View>
          <View style={[styles.pill, { backgroundColor: tone + '1A' }]}>
            <Ionicons name={STATUS_ICON[item.status]} size={13} color={tone} />
            <Text style={[styles.pillText, { color: tone }]}>{INCIDENT_STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
        <Text style={[styles.title, { color: colors.fg }]} accessibilityRole="header">{item.title}</Text>
        <Text style={[styles.meta, { color: colors.mutedFg }]}>
          {cat.label} · aberta {relativeDate(item.createdAt)}
          {item.reporterName ? ` por ${item.reporterName}` : ''}
        </Text>
        <Text style={[styles.body, { color: colors.fg }]} selectable>{item.description}</Text>
        {item.location ? (
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={15} color={colors.mutedFg} />
            <Text style={[styles.meta, { color: colors.mutedFg, marginTop: 0 }]}>{item.location}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.section, { color: colors.mutedFg }]}>Andamento</Text>
      <View style={[styles.timeline, { backgroundColor: colors.card }]}>
        {steps.map((s, i) => {
          const stepColor = s.done ? colors[statusTone(s.key)] : colors.border;
          const last = i === steps.length - 1;
          return (
            <View key={s.key} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.node, { borderColor: stepColor, backgroundColor: s.done ? stepColor : 'transparent' }]}>
                  {s.done && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                {!last && <View style={[styles.line, { backgroundColor: steps[i + 1].done ? stepColor : colors.border }]} />}
              </View>
              <View style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
                <Text style={[styles.stepTitle, { color: s.done ? colors.fg : colors.mutedFg }]}>{INCIDENT_STATUS_LABELS[s.key]}</Text>
                <Text style={[styles.stepHint, { color: colors.mutedFg }]}>{STEP_HINT[s.key]}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {item.responseNote ? (
        <View style={[styles.response, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.responseHead}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
            <Text style={[styles.responseTitle, { color: colors.primary }]}>
              Resposta {item.respondedByName ? `de ${item.respondedByName}` : 'do síndico'}
            </Text>
          </View>
          <Text style={[styles.body, { color: colors.fg, marginTop: 6 }]}>{item.responseNote}</Text>
          {item.respondedAt ? (
            <Text style={[styles.meta, { color: colors.mutedFg }]}>
              {formatDayMonth(item.respondedAt)} às {formatTime(item.respondedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {canManage && (
        <View style={[styles.manage, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.manageTitle, { color: colors.fg }]}>{closed ? 'Reabrir ou comentar' : 'Responder ao morador'}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.fg }]}
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 1000))}
            placeholder="Ex: Eletricista vem amanhã de manhã."
            placeholderTextColor={colors.mutedFg}
            multiline
            accessibilityLabel="Resposta ao morador"
          />
          <View style={styles.actions}>
            {item.status !== 'EmAndamento' && (
              <Button
                title={closed ? 'Reabrir' : 'Em andamento'}
                icon="hammer-outline"
                variant="outline"
                onPress={() => changeStatus('EmAndamento')}
                loading={saving === 'EmAndamento'}
              />
            )}
            {item.status !== 'Resolvida' && (
              <Button title="Marcar como resolvida" icon="checkmark-circle-outline" onPress={() => changeStatus('Resolvida')} loading={saving === 'Resolvida'} />
            )}
            {!closed && (
              <Button title="Recusar" icon="close-circle-outline" variant="danger" onPress={() => changeStatus('Recusada')} loading={saving === 'Recusada'} />
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  content: { padding: 16, paddingBottom: 80 },
  hero: { borderRadius: radius.lg, padding: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catTile: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.xl },
  pillText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26, marginTop: 14 },
  meta: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 4 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, marginTop: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  section: { fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
  timeline: { borderRadius: radius.lg, padding: 16 },
  step: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 20 },
  node: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginVertical: 2 },
  stepTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  stepHint: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 1 },
  response: { borderRadius: radius.lg, padding: 16, marginTop: 16 },
  responseHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  responseTitle: { fontFamily: fontFamily.semibold, fontSize: 14 },
  manage: { borderRadius: radius.lg, borderWidth: 1, padding: 16, marginTop: 16, gap: 12 },
  manageTitle: { fontFamily: fontFamily.bold, fontSize: 15 },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, minHeight: 72, textAlignVertical: 'top', fontFamily: fontFamily.regular, fontSize: 15 },
  actions: { gap: 10 },
});
