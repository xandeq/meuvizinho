import { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius } from '../theme/tokens';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { color: colors.fg }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: focused ? colors.card : colors.muted, color: colors.fg, borderColor: 'transparent' },
          focused && { borderColor: colors.primary },
          error && { borderColor: colors.danger, backgroundColor: colors.dangerLight },
        ]}
        placeholderTextColor={colors.mutedFg}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fontFamily.semibold, fontSize: 14, marginBottom: 6 },
  input: {
    height: 52,
    borderRadius: radius.sm,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontFamily: fontFamily.regular,
    fontSize: 16,
  },
  error: { marginTop: 6, fontFamily: fontFamily.semibold, fontSize: 13 },
});
