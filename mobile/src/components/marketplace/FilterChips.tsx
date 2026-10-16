import { Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        label="Vendedor verificado"
        icon="checkmark-circle"
        verification
        active={filters.verifiedOnly}
        onPress={() => setFilters({ verifiedOnly: !filters.verifiedOnly })}
      />
      <Chip
        label="Tudo"
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
  icon,
  verification,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  // Só o filtro de vendedor verificado usa o verde de verificação (DESIGN.md: Regra do Verde Reservado).
  verification?: boolean;
}) {
  const { colors } = useTheme();
  const fill = verification ? colors.secondaryFill : colors.primaryFill;
  const tint = verification ? colors.verified : colors.mutedFg;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active ? { backgroundColor: fill, borderColor: fill } : { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={active ? '#fff' : tint} /> : null}
      <Text style={active ? styles.chipTextActive : [styles.chipTextInactive, { color: colors.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Sem maxHeight fixo: 48 cortava a perna do "g" (chip real ~49px).
  // ScrollView horizontal vem com flexShrink: 1; espremido pela lista abaixo, cortava a base dos chips.
  row: { flexGrow: 0, flexShrink: 0 },
  content: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipTextActive: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 13 },
  chipTextInactive: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
