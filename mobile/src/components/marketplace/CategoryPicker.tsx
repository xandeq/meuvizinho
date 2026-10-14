import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CategoryDto } from '../../lib/api/marketplace.types';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius } from '../../theme/tokens';

interface Props {
  visible: boolean;
  categories: CategoryDto[];
  onSelect: (categoryCode: string, subcategoryCode: string) => void;
  onClose: () => void;
}

/**
 * D-03: Two-step chip grid (category → subcategory), not dropdowns.
 */
export function CategoryPicker({ visible, categories, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | null>(null);

  const handleClose = () => {
    setSelectedCategory(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.fg }]}>
            {selectedCategory ? selectedCategory.displayName : 'Escolha a categoria'}
          </Text>
          <Pressable accessibilityRole="button" onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.mutedFg} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {!selectedCategory
            ? categories
                .filter((c) => c.enabled)
                .map((cat) => (
                  <Pressable accessibilityRole="button"
                    key={cat.code}
                    style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: radius.md }]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.chipText, { color: colors.fg }]}>{cat.displayName}</Text>
                  </Pressable>
                ))
            : selectedCategory.subcategories.map((sub) => (
                <Pressable accessibilityRole="button"
                  key={sub.code}
                  style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: radius.md }]}
                  onPress={() => {
                    onSelect(selectedCategory.code, sub.code);
                    setSelectedCategory(null);
                  }}
                >
                  <Text style={[styles.chipText, { color: colors.fg }]}>{sub.displayName}</Text>
                </Pressable>
              ))}
        </ScrollView>
        {selectedCategory && (
          <Pressable accessibilityRole="button"
            style={[styles.backBtn, { borderTopColor: colors.border }]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons name="arrow-back" size={16} color={colors.secondary} />
            <Text style={[styles.backText, { color: colors.secondary }]}>Voltar para categorias</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { fontFamily: fontFamily.bold, fontSize: 18 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    margin: 4,
  },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16, borderTopWidth: 1 },
  backText: { fontFamily: fontFamily.bold },
});
