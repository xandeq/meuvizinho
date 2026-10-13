import { Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useMarketplaceStore } from '../../lib/marketplace-store';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily } from '../../theme/tokens';

interface Props {
  categories: { code: string; displayName: string }[];
}

export function FilterChips({ categories }: Props) {
  const filters = useMarketplaceStore((s) => s.filters);
  const setFilters = useMarketplaceStore((s) => s.setFilters);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      <Chip
        label="Verificado"
        active={filters.verifiedOnly}
        onPress={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
      />
      <Chip
        label="Todas categorias"
        active={!filters.category}
        onPress={() => setFilters({ category: undefined })}
      />
      {categories.map((cat) => (
        <Chip
          key={cat.code}
          label={cat.displayName}
          active={filters.category === cat.code}
          onPress={() =>
            setFilters({ category: filters.category === cat.code ? undefined : cat.code })
          }
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.secondary, borderColor: colors.secondary }
          : { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={active ? styles.chipTextActive : [styles.chipTextInactive, { color: colors.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { maxHeight: 48 },
  content: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
  },
  chipTextActive: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 13 },
  chipTextInactive: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
