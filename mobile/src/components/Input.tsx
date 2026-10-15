import { useState } from 'react';
import { TextInput, View, Text, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius } from '../theme/tokens';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  /** Texto de apoio abaixo do campo (some quando há erro). */
  hint?: string;
}

export function Input({ label, error, hint, onFocus, onBlur, secureTextEntry, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  // Campo de senha ganha "mostrar/ocultar": digitar senha forte às cegas no celular gerava erro de confirmação.
  const [hidden, setHidden] = useState(true);
  const secret = !!secureTextEntry;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { color: colors.fg }]}>{label}</Text>
      <View>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: focused ? colors.card : colors.muted, color: colors.fg, borderColor: 'transparent' },
            focused && { borderColor: colors.primary },
            error && { borderColor: colors.danger, backgroundColor: colors.dangerLight },
            secret && { paddingRight: 52 },
          ]}
          placeholderTextColor={colors.mutedFg}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secret && hidden}
          accessibilityLabel={label}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {secret ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            style={styles.eye}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Mostrar ${label.toLowerCase()}` : `Ocultar ${label.toLowerCase()}`}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={21} color={colors.mutedFg} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.mutedFg }]}>{hint}</Text>
      ) : null}
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
  eye: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 52, alignItems: 'center', justifyContent: 'center' },
  error: { marginTop: 6, fontFamily: fontFamily.semibold, fontSize: 13 },
  hint: { marginTop: 6, fontFamily: fontFamily.regular, fontSize: 13 },
});
