import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCondominium, claimCondominium } from '../../../src/lib/api/community';
import { getMyResidentStatus, requestResidency } from '../../../src/lib/api/condo';
import type { MyResidentInfo } from '../../../src/lib/api/condo.types';
import { useAuthStore } from '../../../src/lib/auth-store';
import {
  WHATSAPP_KIND_LABELS,
  CONDOMINIUM_STATUS_LABELS,
  type CondominiumDetail,
  type CondominiumRole,
} from '../../../src/lib/api/community.types';
import { Button } from '../../../src/components/Button';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../../src/theme/tokens';

const ROLES: { code: CondominiumRole; label: string }[] = [
  { code: 'Sindico', label: 'Síndico' },
  { code: 'SubSindico', label: 'Subsíndico' },
  { code: 'Administradora', label: 'Administradora' },
  { code: 'Conselheiro', label: 'Conselheiro' },
];

type IconName = keyof typeof Ionicons.glyphMap;

export default function CondominiumDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const isAdmin = useAuthStore((s) => !!s.user?.isAdmin);
  const { id } = useLocalSearchParams<{ id: string }>();
  const condoId = Number(id);

  const [condo, setCondo] = useState<CondominiumDetail | null>(null);
  const [residency, setResidency] = useState<MyResidentInfo | null>(null);
  const [unit, setUnit] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showClaim, setShowClaim] = useState(false);
  const [role, setRole] = useState<CondominiumRole>('Sindico');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!condoId) return;
    setLoading(true);
    Promise.all([
      getCondominium(condoId).then(setCondo),
      // Sem vínculo legível (ex.: erro de rede) o card de vínculo só não aparece.
      getMyResidentStatus(condoId).then(setResidency).catch(() => setResidency(null)),
    ]).finally(() => setLoading(false));
  };

  const handleRequestResidency = async () => {
    setRequesting(true);
    try {
      await requestResidency(condoId, { unit: unit.trim() || undefined });
      setUnit('');
      load();
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.error || 'Não foi possível enviar a solicitação.');
    } finally {
      setRequesting(false);
    }
  };

  useEffect(() => { load(); }, [condoId]);

  const handleClaim = async () => {
    if (justification.trim().length < 10) {
      Alert.alert('Justificativa muito curta', 'Explique por que você administra este condomínio (mín. 10 caracteres).');
      return;
    }
    setSubmitting(true);
    try {
      await claimCondominium(condoId, { requestedRole: role, justification: justification.trim() });
      setShowClaim(false);
      load();
      Alert.alert('Enviado', 'Sua reivindicação foi enviada para análise.');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.error || 'Não foi possível enviar a solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !condo) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const canClaim = !condo.isMySindico && condo.myClaimStatus == null;
  const isResident = residency?.status === 'Approved';
  // Mesma regra do backend (CondoAccess.CanUse) e do site.
  const canUse = isResident || condo.isMySindico || isAdmin;
  const canRequestResidency =
    !condo.isMySindico && residency != null && ['None', 'Rejected', 'Revoked'].includes(residency.status);

  const tiles: { icon: IconName; title: string; sub: string; href: Href }[] = [
    { icon: 'megaphone-outline', title: 'Comunicados', sub: 'Avisos oficiais do síndico', href: `/condominios/${condoId}/comunicados` },
    { icon: 'calendar-outline', title: 'Reservar área comum', sub: 'Salão, churrasqueira e mais', href: `/condominios/${condoId}/areas` },
    { icon: 'bookmark-outline', title: 'Minhas reservas', sub: 'Acompanhe e cancele', href: `/condominios/${condoId}/reservas` },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <Ionicons name="business" size={28} color="#fff" style={{ marginBottom: 8 }} />
        <Text style={styles.heroTitle}>{condo.name}</Text>
        {condo.addressLine && <Text style={styles.heroSub}>{condo.addressLine}</Text>}
        {canUse && (
          <View style={styles.heroChip}>
            <Ionicons name={condo.isMySindico ? 'shield-checkmark' : isResident ? 'home' : 'key'} size={12} color="#fff" />
            <Text style={styles.heroChipText}>
              {condo.isMySindico
                ? 'Você é o síndico'
                : isResident
                  ? `Morador${residency?.unit ? ` · ${residency.unit}` : ''}`
                  : 'Acesso de administrador'}
            </Text>
          </View>
        )}
      </View>

      {residency?.status === 'Pending' && !condo.isMySindico && (
        <View style={[styles.pendingBanner, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40', marginTop: 0, marginBottom: 16 }]}>
          <Ionicons name="time-outline" size={16} color={colors.accent} />
          <Text style={[styles.pendingText, { color: colors.accent, flex: 1 }]}>
            Vínculo de morador em análise pelo síndico{residency.unit ? ` · ${residency.unit}` : ''}.
          </Text>
        </View>
      )}

      {canRequestResidency && (
        <View style={[styles.residencyCard, shadow.ambientLow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.residencyHeader}>
            <View style={[styles.residencyIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="key-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.residencyTitle, { color: colors.fg }]}>Você mora aqui?</Text>
              <Text style={[styles.residencySub, { color: colors.mutedFg }]}>
                Vincule sua unidade para ler os comunicados e reservar as áreas comuns.
              </Text>
            </View>
          </View>
          {residency?.status === 'Rejected' && residency.reviewNote && (
            <Text style={[styles.reviewNote, { color: colors.danger }]}>Solicitação anterior recusada: {residency.reviewNote}</Text>
          )}
          <TextInput
            style={[styles.unitInput, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.fg }]}
            value={unit}
            onChangeText={setUnit}
            placeholder="Unidade (ex: Bloco B, Apto 302)"
            placeholderTextColor={colors.mutedFg}
            maxLength={60}
            accessibilityLabel="Unidade"
          />
          <Button title="Solicitar vínculo de morador" icon="send-outline" onPress={handleRequestResidency} loading={requesting} />
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: colors.mutedFg }]}>Vida no condomínio</Text>
      <View style={[styles.tiles, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {tiles.map((t, i) => (
          <Pressable
            key={t.title}
            onPress={() =>
              canUse
                ? router.push(t.href)
                : Alert.alert('Só para moradores', 'Solicite o vínculo de morador para acessar esta área do condomínio.')
            }
            accessibilityRole="button"
            accessibilityLabel={t.title}
            accessibilityState={{ disabled: !canUse }}
            style={({ pressed }) => [
              styles.tile,
              i < tiles.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              { opacity: pressed ? 0.6 : canUse ? 1 : 0.55 },
            ]}
          >
            <View style={[styles.tileIcon, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name={t.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tileTitle, { color: colors.fg }]}>{t.title}</Text>
              <Text style={[styles.tileSub, { color: colors.mutedFg }]}>{t.sub}</Text>
            </View>
            <Ionicons name={canUse ? 'chevron-forward' : 'lock-closed-outline'} size={18} color={colors.mutedFg} />
          </Pressable>
        ))}
      </View>

      <View style={[styles.infoCard, shadow.ambientLow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedFg }]}>Status</Text>
          <Text style={[styles.infoValue, { color: colors.fg }]}>{CONDOMINIUM_STATUS_LABELS[condo.status]}</Text>
        </View>
        {condo.sindicoName && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedFg }]}>Síndico</Text>
            <Text style={[styles.infoValue, { color: colors.fg }]}>{condo.sindicoName}</Text>
          </View>
        )}
        {condo.unitsCount != null && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedFg }]}>Unidades</Text>
            <Text style={[styles.infoValue, { color: colors.fg }]}>{condo.unitsCount}</Text>
          </View>
        )}
      </View>

      {condo.description && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedFg }]}>Sobre</Text>
          <Text style={[styles.description, { color: colors.fg }]}>{condo.description}</Text>
        </>
      )}

      <Text style={[styles.sectionLabel, { color: colors.mutedFg }]}>Grupos de WhatsApp</Text>
      {condo.groups.length === 0 ? (
        <Text style={[styles.emptyGroups, { color: colors.mutedFg }]}>Nenhum grupo vinculado ainda.</Text>
      ) : (
        condo.groups.map((g) => (
          <View key={g.id} style={[styles.groupRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="logo-whatsapp" size={18} color={colors.secondary} />
            <Text style={[styles.groupName, { color: colors.fg }]} numberOfLines={1}>{g.name}</Text>
            <Text style={[styles.groupKind, { color: colors.mutedFg }]}>{WHATSAPP_KIND_LABELS[g.kind]}</Text>
          </View>
        ))
      )}

      {canClaim && (
        <View style={styles.claimSection}>
          {!showClaim ? (
            <Button title="Sou síndico deste condomínio" icon="shield-checkmark-outline" variant="outline" onPress={() => setShowClaim(true)} />
          ) : (
            <View style={[styles.claimForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedFg }]}>Seu papel</Text>
              <View style={styles.roleGrid}>
                {ROLES.map((r) => (
                  <View key={r.code} style={styles.roleWrap}>
                    <Button title={r.label} variant={role === r.code ? 'primary' : 'outline'} onPress={() => setRole(r.code)} />
                  </View>
                ))}
              </View>
              <Text style={[styles.sectionLabel, { color: colors.mutedFg, marginTop: 12 }]}>Justificativa</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.fg, borderRadius: radius.sm }]}
                value={justification}
                onChangeText={setJustification}
                placeholder="Explique por que você administra este condomínio..."
                placeholderTextColor={colors.mutedFg}
                multiline
              />
              <View style={{ height: 10 }} />
              <Button title="Enviar reivindicação" icon="send-outline" onPress={handleClaim} loading={submitting} />
            </View>
          )}
        </View>
      )}

      {condo.myClaimStatus && !condo.isMySindico && (
        <View style={[styles.pendingBanner, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}>
          <Ionicons name="time-outline" size={16} color={colors.accent} />
          <Text style={[styles.pendingText, { color: colors.accent }]}>Sua reivindicação está em análise.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: radius.lg, padding: 20, marginBottom: 16 },
  heroTitle: { color: '#fff', fontFamily: fontFamily.extrabold, fontSize: 20, marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontFamily: fontFamily.regular, fontSize: 13 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroChipText: { color: '#fff', fontFamily: fontFamily.semibold, fontSize: 12 },
  residencyCard: { borderRadius: radius.md, borderWidth: 1, padding: 14, marginBottom: 16, gap: 12 },
  residencyHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  residencyIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  residencyTitle: { fontFamily: fontFamily.bold, fontSize: 15 },
  residencySub: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  reviewNote: { fontFamily: fontFamily.medium, fontSize: 12 },
  unitInput: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 12, fontFamily: fontFamily.regular, fontSize: 14 },
  tiles: { borderRadius: radius.md, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  tileIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontFamily: fontFamily.semibold, fontSize: 14 },
  tileSub: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 1 },
  infoCard: { borderRadius: radius.md, borderWidth: 1, padding: 14, marginBottom: 16, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontFamily: fontFamily.medium, fontSize: 13 },
  infoValue: { fontFamily: fontFamily.semibold, fontSize: 13 },
  sectionLabel: { fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  description: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  emptyGroups: { fontFamily: fontFamily.regular, fontSize: 13, marginBottom: 16 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.sm, borderWidth: 1, marginBottom: 8 },
  groupName: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 13 },
  groupKind: { fontFamily: fontFamily.regular, fontSize: 11 },
  claimSection: { marginTop: 20 },
  claimForm: { borderRadius: radius.md, borderWidth: 1, padding: 14 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleWrap: { minWidth: '47%', flexGrow: 1 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, minHeight: 80, textAlignVertical: 'top', fontFamily: fontFamily.regular, fontSize: 14 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.sm, borderWidth: 1, marginTop: 16 },
  pendingText: { fontFamily: fontFamily.medium, fontSize: 13 },
});
