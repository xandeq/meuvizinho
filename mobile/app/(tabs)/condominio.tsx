import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CondominiumsScreen from '../condominios/index';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useBairroName } from '../../src/lib/useBairroName';
import { useAuthStore } from '../../src/lib/auth-store';
import { getCondominiums } from '../../src/lib/api/community';
import { getMyResidentStatus } from '../../src/lib/api/condo';
import type { CondominiumSummary } from '../../src/lib/api/community.types';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../src/theme/tokens';

type Mine = { condo: CondominiumSummary; unit: string | null };

// Aba "Condomínio": quem já mora num prédio do bairro vê o SEU condomínio no topo,
// com atalhos (antes só aparecia a lista de todos os prédios).
export default function CondominiumsTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const bairroName = useBairroName();
  const bairroId = useAuthStore((s) => s.user?.bairroId ?? 0);
  const [mine, setMine] = useState<Mine | null>(null);

  useEffect(() => {
    if (!bairroId) return;
    let alive = true;
    (async () => {
      try {
        const condos = await getCondominiums(bairroId);
        for (const condo of condos.slice(0, 20)) {
          const me = await getMyResidentStatus(condo.id).catch(() => null);
          if (me?.status === 'Approved') {
            if (alive) setMine({ condo, unit: me.unit });
            return;
          }
        }
      } catch {
        // Sem destaque: a lista abaixo continua funcionando.
      }
    })();
    return () => { alive = false; };
  }, [bairroId]);

  const shortcuts: { icon: keyof typeof Ionicons.glyphMap; label: string; href: Href }[] = mine
    ? [
        { icon: 'megaphone-outline', label: 'Comunicados', href: `/condominios/${mine.condo.id}/comunicados` },
        { icon: 'construct-outline', label: 'Ocorrências', href: `/condominios/${mine.condo.id}/ocorrencias` },
        { icon: 'calendar-outline', label: 'Reservar', href: `/condominios/${mine.condo.id}/areas` },
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Condomínio" place={bairroName} />
      {mine ? (
        <View style={[styles.mine, shadow.ambientLow, { backgroundColor: colors.card }]}>
          <Pressable
            onPress={() => router.push(`/condominios/${mine.condo.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Seu condomínio: ${mine.condo.name}${mine.unit ? `, ${mine.unit}` : ''}`}
            style={styles.mineHead}
          >
            <View style={[styles.mineIcon, { backgroundColor: colors.primaryFill }]}>
              <Ionicons name="business" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.primary }]}>Seu condomínio</Text>
              <Text style={[styles.mineName, { color: colors.fg }]} numberOfLines={1}>{mine.condo.name}</Text>
              {mine.unit ? <Text style={[styles.unit, { color: colors.mutedFg }]}>{mine.unit}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedFg} />
          </Pressable>
          <View style={styles.shortcuts}>
            {shortcuts.map((s) => (
              <Pressable
                key={s.label}
                onPress={() => router.push(s.href)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.shortcut, { backgroundColor: colors.muted, opacity: pressed ? 0.8 : 1 }]}
              >
                <Ionicons name={s.icon} size={20} color={colors.primary} />
                <Text style={[styles.shortcutText, { color: colors.fg }]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <CondominiumsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  mine: { marginHorizontal: 16, marginBottom: 8, borderRadius: radius.lg, padding: 14 },
  mineHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  mineIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 0.3 },
  mineName: { fontFamily: fontFamily.extrabold, fontSize: 18 },
  unit: { fontFamily: fontFamily.medium, fontSize: 13 },
  shortcuts: { flexDirection: 'row', gap: 8, marginTop: 12 },
  shortcut: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, minHeight: 64 },
  shortcutText: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
