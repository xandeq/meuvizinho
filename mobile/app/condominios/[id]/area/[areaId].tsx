import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCommonArea, getAreaAvailability, createReservation } from '../../../../src/lib/api/condo';
import type { CommonAreaDetail, AvailabilityBlock, AreaReservation } from '../../../../src/lib/api/condo.types';
import {
  bookableDays,
  startSlots,
  durationOptions,
  atMinutes,
  formatRange,
  formatDuration,
  type SlotOption,
} from '../../../../src/features/condominium/reservation-slots';
import { Button } from '../../../../src/components/Button';
import { EmptyState } from '../../../../src/components/EmptyState';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../../src/theme/tokens';

const DAY_STRIP_CAP = 30;

export default function AreaReservaScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id, areaId } = useLocalSearchParams<{ id: string; areaId: string }>();
  const condoId = Number(id);
  const area_id = Number(areaId);

  const [area, setArea] = useState<CommonAreaDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<AvailabilityBlock[]>([]);
  const [now, setNow] = useState(() => new Date());

  const [dayKey, setDayKey] = useState<string | null>(null);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [guests, setGuests] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<AreaReservation | null>(null);
  // A confirmação fica no topo; quem enviou lá embaixo não a via e ficava sem saber se deu certo.
  const scrollRef = useRef<ScrollView>(null);
  const successY = useRef(0);

  const loadAvailability = useCallback(() => {
    const from = new Date();
    const to = new Date(from.getTime() + (DAY_STRIP_CAP + 1) * 86_400_000);
    setNow(from);
    getAreaAvailability(condoId, area_id, { from: from.toISOString(), to: to.toISOString() })
      .then(setBusy)
      .catch(() => setBusy([]));
  }, [condoId, area_id]);

  useEffect(() => {
    getCommonArea(condoId, area_id)
      .then(setArea)
      .catch((e: any) =>
        setLoadError(
          e?.response?.status === 403
            ? 'Só moradores vinculados podem reservar esta área.'
            : e?.response?.status === 404
              ? 'Área comum não encontrada.'
              : 'Não foi possível carregar a área.'
        )
      );
    loadAvailability();
  }, [condoId, area_id, loadAvailability]);

  const days = useMemo(() => (area ? bookableDays(now, area.maxAdvanceDays, DAY_STRIP_CAP) : []), [area, now]);
  const day = days.find((d) => d.key === dayKey) ?? null;

  // Primeiro dia com algum horário livre já vem selecionado.
  useEffect(() => {
    if (!area || dayKey || days.length === 0) return;
    const first = days.find((d) => startSlots(d.date, area, busy, now).some((s) => !s.disabled));
    setDayKey((first ?? days[0]).key);
  }, [area, days, busy, now, dayKey]);

  const slots = useMemo(() => (area && day ? startSlots(day.date, area, busy, now) : []), [area, day, busy, now]);
  const durations = useMemo(
    () => (area && day && startMin != null ? durationOptions(day.date, startMin, area, busy) : []),
    [area, day, startMin, busy]
  );

  const pickDay = (key: string) => {
    setDayKey(key);
    setStartMin(null);
    setDuration(null);
    setFormError(null);
  };

  const pickStart = (m: number) => {
    setStartMin(m);
    setFormError(null);
    // Mantém a duração escolhida se ainda couber; senão sugere 2h (ou a maior possível).
    if (!area || !day) return;
    const opts = durationOptions(day.date, m, area, busy).filter((o) => !o.disabled);
    const keep = opts.find((o) => o.minutes === duration);
    const preferred = opts.find((o) => o.minutes === 120) ?? opts[opts.length - 1];
    setDuration((keep ?? preferred)?.minutes ?? null);
  };

  const submit = async () => {
    if (!area || !day || startMin == null || duration == null) {
      setFormError('Escolha o dia, o horário e a duração.');
      return;
    }
    const guestsCount = guests ? Number(guests) : undefined;
    if (guestsCount != null && (Number.isNaN(guestsCount) || guestsCount < 0)) {
      setFormError('Número de convidados inválido.');
      return;
    }
    if (guestsCount != null && area.capacity != null && guestsCount > area.capacity) {
      setFormError(`Este espaço comporta no máximo ${area.capacity} pessoas.`);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await createReservation(condoId, area_id, {
        startUtc: atMinutes(day.date, startMin).toISOString(),
        endUtc: atMinutes(day.date, startMin + duration).toISOString(),
        title: title.trim() || undefined,
        guestsCount,
      });
      setCreated(res);
      setTitle('');
      setGuests('');
      setStartMin(null);
      setDuration(null);
      loadAvailability();
    } catch (e: any) {
      const msg = e?.response?.data?.error;
      setFormError(
        e?.response?.status === 409
          ? msg ?? 'Esse horário acabou de ser reservado. Escolha outro.'
          : msg ?? 'Não foi possível criar a reserva. Tente novamente.'
      );
      if (e?.response?.status === 409) loadAvailability();
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <EmptyState icon="lock-closed-outline" title={loadError} />
      </View>
    );
  }

  if (!area) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const open = area.openTime?.slice(0, 5);
  const close = area.closeTime?.slice(0, 5);

  const renderChip = (s: SlotOption, selected: boolean, onPress: () => void) => (
    <Pressable
      key={s.minutes}
      onPress={onPress}
      disabled={s.disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: s.disabled }}
      accessibilityLabel={s.disabled ? `${s.label}, indisponível` : s.label}
      style={({ pressed }) => [
        styles.slot,
        {
          backgroundColor: selected ? colors.primaryFill : s.disabled ? colors.muted : colors.card,
          borderColor: selected ? colors.primaryFill : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.slotText,
          {
            color: selected ? '#fff' : s.disabled ? colors.mutedFg : colors.fg,
            textDecorationLine: s.disabled ? 'line-through' : 'none',
          },
        ]}
      >
        {s.label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, shadow.ambientLow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.name, { color: colors.fg }]}>{area.name}</Text>
        {area.description ? <Text style={[styles.desc, { color: colors.mutedFg }]}>{area.description}</Text> : null}
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: (area.requiresApproval ? colors.accent : colors.primary) + '15' }]}>
            <Text style={[styles.chipText, { color: area.requiresApproval ? colors.accent : colors.primary }]}>
              {area.requiresApproval ? 'Sujeita a aprovação do síndico' : 'Confirmação imediata'}
            </Text>
          </View>
          {area.capacity != null && (
            <View style={[styles.chip, { backgroundColor: colors.muted }]}>
              <Text style={[styles.chipText, { color: colors.mutedFg }]}>Até {area.capacity} pessoas</Text>
            </View>
          )}
          {(open || close) && (
            <View style={[styles.chip, { backgroundColor: colors.muted }]}>
              <Text style={[styles.chipText, { color: colors.mutedFg }]}>{open ?? '00:00'}–{close ?? '24:00'}</Text>
            </View>
          )}
        </View>
        {area.rules ? (
          <View style={[styles.rules, { backgroundColor: colors.muted }]}>
            <Text style={[styles.rulesTitle, { color: colors.fg }]}>Regras de uso</Text>
            <Text style={[styles.rulesText, { color: colors.fg }]}>{area.rules}</Text>
          </View>
        ) : null}
        <Text style={[styles.policy, { color: colors.mutedFg }]}>
          {area.minAdvanceHours > 0 ? `Reserve com ${area.minAdvanceHours}h de antecedência` : 'Sem antecedência mínima'}
          {` · até ${area.maxAdvanceDays} dias antes`}
          {area.maxDurationMinutes != null ? ` · máx. ${formatDuration(area.maxDurationMinutes)}` : ''}
        </Text>
      </View>

      {created && (
        <View
          onLayout={(e) => {
            successY.current = e.nativeEvent.layout.y;
            scrollRef.current?.scrollTo({ y: Math.max(0, successY.current - 16), animated: true });
          }}
          style={[
            styles.success,
            {
              backgroundColor: (created.status === 'Approved' ? colors.secondary : colors.accent) + '12',
              borderColor: (created.status === 'Approved' ? colors.secondary : colors.accent) + '45',
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name={created.status === 'Approved' ? 'checkmark-circle' : 'hourglass'}
            size={22}
            color={created.status === 'Approved' ? colors.secondary : colors.accent}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.successTitle, { color: created.status === 'Approved' ? colors.secondary : colors.accent }]}>
              {created.status === 'Approved' ? 'Reserva confirmada!' : 'Reserva enviada ao síndico'}
            </Text>
            <Text style={[styles.successSub, { color: colors.fg }]}>{formatRange(created.startUtc, created.endUtc)}</Text>
            <Pressable onPress={() => router.push(`/condominios/${condoId}/reservas`)} accessibilityRole="link" hitSlop={8}>
              <Text style={[styles.successLink, { color: colors.primary }]}>Ver minhas reservas</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={[styles.section, { color: colors.mutedFg }]}>Dia</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
        {days.map((d) => {
          const selected = d.key === dayKey;
          return (
            <Pressable
              key={d.key}
              onPress={() => pickDay(d.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${d.topLabel}, ${d.bottomLabel}`}
              style={({ pressed }) => [
                styles.day,
                {
                  backgroundColor: selected ? colors.primaryFill : colors.card,
                  borderColor: selected ? colors.primaryFill : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.dayTop, { color: selected ? 'rgba(255,255,255,0.85)' : colors.mutedFg }]}>{d.topLabel}</Text>
              <Text style={[styles.dayBottom, { color: selected ? '#fff' : colors.fg }]}>{d.bottomLabel}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.section, { color: colors.mutedFg }]}>Horário de início</Text>
      {slots.length === 0 || slots.every((s) => s.disabled) ? (
        <Text style={[styles.emptySlots, { color: colors.mutedFg }]}>Nenhum horário livre neste dia. Tente outro dia.</Text>
      ) : (
        <View style={styles.grid}>{slots.map((s) => renderChip(s, s.minutes === startMin, () => pickStart(s.minutes)))}</View>
      )}

      {startMin != null && durations.length > 0 && (
        <>
          <Text style={[styles.section, { color: colors.mutedFg }]}>Duração</Text>
          <View style={styles.grid}>
            {durations.map((o) => renderChip(o, o.minutes === duration, () => { setDuration(o.minutes); setFormError(null); }))}
          </View>
        </>
      )}

      <Text style={[styles.section, { color: colors.mutedFg }]}>Detalhes (opcional)</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg }]}
        value={title}
        onChangeText={(t) => setTitle(t.slice(0, 120))}
        placeholder="Motivo (ex: Aniversário)"
        placeholderTextColor={colors.mutedFg}
        maxLength={120}
        accessibilityLabel="Motivo da reserva"
      />
      {area.capacity != null && (
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.fg, marginTop: 10 }]}
          value={guests}
          onChangeText={(t) => setGuests(t.replace(/[^0-9]/g, ''))}
          placeholder={`Nº de convidados (máx. ${area.capacity})`}
          placeholderTextColor={colors.mutedFg}
          keyboardType="number-pad"
          accessibilityLabel="Número de convidados"
        />
      )}

      {day && startMin != null && duration != null && (
        <View style={[styles.summary, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="calendar" size={16} color={colors.primary} />
          <Text style={[styles.summaryText, { color: colors.primary }]}>
            {formatRange(atMinutes(day.date, startMin).toISOString(), atMinutes(day.date, startMin + duration).toISOString())}
          </Text>
        </View>
      )}

      {formError && (
        <Text style={[styles.error, { color: colors.danger, backgroundColor: colors.danger + '12' }]} accessibilityLiveRegion="assertive">
          {formError}
        </Text>
      )}

      <View style={{ marginTop: 16 }}>
        <Button
          title={area.requiresApproval ? 'Enviar para aprovação' : 'Confirmar reserva'}
          icon={area.requiresApproval ? 'send-outline' : 'checkmark-circle-outline'}
          onPress={submit}
          loading={submitting}
          disabled={startMin == null || duration == null}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  content: { padding: 16, paddingBottom: 80 },
  header: { borderRadius: radius.md, borderWidth: 1, padding: 16, gap: 10 },
  name: { fontFamily: fontFamily.extrabold, fontSize: 20 },
  desc: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.lg },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  rules: { borderRadius: radius.sm, padding: 12 },
  rulesTitle: { fontFamily: fontFamily.semibold, fontSize: 13, marginBottom: 4 },
  rulesText: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  policy: { fontFamily: fontFamily.regular, fontSize: 12 },
  success: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1, marginTop: 16 },
  successTitle: { fontFamily: fontFamily.bold, fontSize: 15 },
  successSub: { fontFamily: fontFamily.medium, fontSize: 13, marginTop: 2 },
  successLink: { fontFamily: fontFamily.semibold, fontSize: 13, marginTop: 6 },
  section: { fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
  dayStrip: { gap: 8, paddingRight: 16 },
  day: { width: 64, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  dayTop: { fontFamily: fontFamily.medium, fontSize: 12 },
  dayBottom: { fontFamily: fontFamily.bold, fontSize: 14, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { minWidth: 72, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  slotText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  emptySlots: { fontFamily: fontFamily.regular, fontSize: 13 },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 14 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.sm, marginTop: 16 },
  summaryText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  error: { fontFamily: fontFamily.medium, fontSize: 13, padding: 10, borderRadius: radius.sm, marginTop: 12 },
});
