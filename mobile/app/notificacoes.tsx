import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useNotificationsStore,
  selectUnread,
  notificationText,
  notificationIcon,
  notificationRoute,
  type NotificationItem,
} from '../src/lib/notifications-store';
import { EmptyState } from '../src/components/EmptyState';
import { ListSkeleton } from '../src/components/Skeleton';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily, radius } from '../src/theme/tokens';

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `há ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function NotificacoesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { items, loaded, loading, error, load, markRead, markAllRead } = useNotificationsStore();
  const unread = useNotificationsStore(selectUnread);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const open = (n: NotificationItem) => {
    if (!n.isRead) markRead(n.id);
    const route = notificationRoute(n);
    if (route) router.push(route);
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const text = notificationText(item);
    return (
      <Pressable
        onPress={() => open(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.isRead ? '' : 'Não lida. '}${text}, ${timeAgo(item.createdAt)}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: item.isRead ? colors.card : colors.primaryLight,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: item.isRead ? colors.muted : colors.card }]}>
          <Ionicons name={notificationIcon(item.type) as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.text, { color: colors.fg, fontFamily: item.isRead ? fontFamily.regular : fontFamily.semibold }]}>
            {text}
          </Text>
          <Text style={[styles.time, { color: colors.mutedFg }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: 'Notificações',
          headerRight: unread > 0
            ? () => (
                <Pressable onPress={markAllRead} accessibilityRole="button" hitSlop={10}>
                  <Text style={[styles.readAll, { color: colors.primary }]}>Marcar lidas</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      {!loaded && loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={loaded && loading} onRefresh={load} tintColor={colors.primary} />}
          ListEmptyComponent={
            error ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Não foi possível carregar"
                subtitle="Verifique sua conexão e tente de novo."
                actionLabel="Tentar de novo"
                onAction={load}
              />
            ) : (
              <EmptyState
                icon="notifications-outline"
                title="Nenhuma notificação"
                subtitle="Respostas, reservas, comunicados e alertas do bairro aparecem aqui."
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, lineHeight: 21 },
  time: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  readAll: { fontFamily: fontFamily.semibold, fontSize: 14 },
});
