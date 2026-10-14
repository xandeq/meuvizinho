import { View, TextInput, Pressable, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius } from '../theme/tokens';

interface Props extends Pick<TextInputProps, 'onSubmitEditing' | 'returnKeyType'> {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  accessibilityLabel?: string;
}

// Campo de busca único do app: lupa, 48px de altura e botão de limpar.
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="search" size={18} color={colors.mutedFg} />
      <TextInput
        style={[styles.input, { color: colors.fg }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedFg}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        returnKeyType="search"
        {...rest}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar busca">
          <Ionicons name="close-circle" size={18} color={colors.mutedFg} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: { flex: 1, fontFamily: fontFamily.regular, fontSize: 15, paddingVertical: 0 },
});
