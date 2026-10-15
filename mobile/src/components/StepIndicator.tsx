import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/tokens';

const STEPS = ['Endereço', 'Comprovante', 'Análise'];

/** Onboarding de verificação: mostra em que passo a pessoa está e quanto falta. */
export function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Passo ${step} de ${STEPS.length}: ${STEPS[step - 1]}`}>
      <View style={styles.bars}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < step ? colors.primaryFill : colors.border }]} />
        ))}
      </View>
      <Text style={[styles.text, { color: colors.mutedFg }]}>
        Passo {step} de {STEPS.length} · <Text style={{ color: colors.primary, fontFamily: fontFamily.semibold }}>{STEPS[step - 1]}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  bars: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  text: { fontFamily: fontFamily.medium, fontSize: 13 },
});
