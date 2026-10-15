import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PASSWORD_RULES } from '@bairronow/shared-validators';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/tokens';

/** Mostra a regra da senha enquanto a pessoa digita (mesma regra da API). */
export function PasswordChecklist({ value }: { value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} accessibilityLabel="Requisitos da senha">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <View key={rule.id} style={styles.row} accessible accessibilityLabel={`${rule.label}: ${ok ? 'ok' : 'pendente'}`}>
            <Ionicons
              name={ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={ok ? colors.primary : colors.mutedFg}
            />
            <Text style={[styles.text, { color: ok ? colors.fg : colors.mutedFg }]}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6, marginTop: -6, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '44%' },
  text: { fontFamily: fontFamily.medium, fontSize: 13 },
});
