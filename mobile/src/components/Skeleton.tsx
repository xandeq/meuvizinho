import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View, StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius as radii } from '../theme/tokens';

interface Props {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: ViewStyle;
}

// Bloco de carregamento com pulso suave (opacidade, driver nativo).
// Respeita "reduzir movimento" do sistema: fica estático.
export function Skeleton({ width = '100%', height, radius = radii.sm, style }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.border, opacity }, style]}
    />
  );
}

// Esqueleto de lista no formato do conteúdo real (linha com avatar + 2 linhas de texto).
export function ListSkeleton({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.list} accessibilityLabel="Carregando" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.row, { backgroundColor: colors.card }]}>
          {avatar && <Skeleton width={44} height={44} radius={radii.md} />}
          <View style={styles.lines}>
            <Skeleton width="62%" height={14} />
            <Skeleton width="88%" height={12} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Esqueleto de grade 2 colunas (marketplace): foto + título + preço.
export function GridSkeleton({ items = 4 }: { items?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid} accessibilityLabel="Carregando" accessibilityRole="progressbar">
      {Array.from({ length: items }, (_, i) => (
        <View key={i} style={[styles.tile, { backgroundColor: colors.card }]}>
          <Skeleton height={140} radius={radii.md} />
          <Skeleton width="80%" height={13} />
          <Skeleton width="45%" height={15} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 6 },
  tile: { width: '47%', margin: '1.5%', padding: 8, gap: 8, borderRadius: radii.lg },
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radii.lg },
  lines: { flex: 1, gap: 8, justifyContent: 'center' },
});
