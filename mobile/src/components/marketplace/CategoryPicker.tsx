import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | null>(null);

  const handleClose = () => {
    setSelectedCategory(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Antes o "voltar" ficava no rodapé, atrás da barra de navegação do Android. */}
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
          {selectedCategory ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar para categorias"
              onPress={() => setSelectedCategory(null)}
              hitSlop={12}
              style={styles.headerBtn}
            >
              <Ionicons name="arrow-back" size={24} color={colors.fg} />
            </Pressable>
          ) : null}
          <Text style={[styles.title, { color: colors.fg }]} numberOfLines={1} accessibilityRole="header">
            {selectedCategory ? selectedCategory.displayName : 'Escolha a categoria'}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={handleClose} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.mutedFg} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: 16 + insets.bottom }]}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: { flex: 1, fontFamily: fontFamily.bold, fontSize: 18 },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
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
});
