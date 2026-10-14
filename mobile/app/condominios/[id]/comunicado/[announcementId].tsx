import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAnnouncement } from '../../../../src/lib/api/condo';
import type { AnnouncementDetail } from '../../../../src/lib/api/condo.types';
import { formatDayMonth, formatTime } from '../../../../src/features/condominium/reservation-slots';
import { EmptyState } from '../../../../src/components/EmptyState';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../../../src/theme/tokens';

export default function ComunicadoDetailScreen() {
  const { colors } = useTheme();
  const { id, announcementId } = useLocalSearchParams<{ id: string; announcementId: string }>();

  const [item, setItem] = useState<AnnouncementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnnouncement(Number(id), Number(announcementId))
      .then(setItem)
      .catch((e: any) =>
        setError(e?.response?.status === 404 ? 'Comunicado não encontrado ou expirado.' : 'Não foi possível abrir o comunicado.')
      );
  }, [id, announcementId]);

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

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      {item.isImportant && (
        <View style={[styles.importantBanner, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '40' }]}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={[styles.importantText, { color: colors.danger }]}>Comunicado importante</Text>
        </View>
      )}
      <Text style={[styles.title, { color: colors.fg }]}>{item.title}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="person-circle-outline" size={16} color={colors.mutedFg} />
        <Text style={[styles.meta, { color: colors.mutedFg }]}>{item.authorName ?? 'Síndico'}</Text>
        {item.authorVerified && <Ionicons name="checkmark-circle" size={14} color={colors.verified} />}
        <Text style={[styles.meta, { color: colors.mutedFg }]}>
          · {formatDayMonth(item.publishedAt)} às {formatTime(item.publishedAt)}
        </Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.body, { color: colors.fg }]} selectable>{item.body}</Text>
      {item.expiresAt && (
        <Text style={[styles.expires, { color: colors.mutedFg }]}>Válido até {formatDayMonth(item.expiresAt)}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  content: { padding: 20, paddingBottom: 80 },
  importantBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, marginBottom: 12 },
  importantText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 22, lineHeight: 28 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' },
  meta: { fontFamily: fontFamily.medium, fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 23 },
  expires: { fontFamily: fontFamily.medium, fontSize: 12, marginTop: 20 },
});
