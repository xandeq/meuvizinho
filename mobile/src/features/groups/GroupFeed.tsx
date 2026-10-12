// Reusable group post list (extracted for testability)
import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';
import type { GroupPost } from './groupsApi';

interface Props {
  posts: GroupPost[];
  onEndReached?: () => void;
}

export function GroupFeed({ posts, onEndReached }: Props) {
  const { colors } = useTheme();
  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => String(p.id)}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => (
        <View style={[styles.card, shadow.ambientLow, { backgroundColor: colors.card, borderRadius: radius.md }]}>
          <Text style={[styles.author, { color: colors.fg }]}>{item.author.displayName}</Text>
          <Text style={[styles.body, { color: colors.fg }]}>{item.body}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedFg }]}>Nenhuma publicação.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  author: { fontFamily: fontFamily.semibold, fontSize: 14, marginBottom: 4 },
  body: { fontFamily: fontFamily.regular, fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40 },
});
