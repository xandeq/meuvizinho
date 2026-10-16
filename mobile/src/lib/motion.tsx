import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Movimento leve e consistente no app. Tudo com driver nativo (sem custo no JS) e desligado
 * quando a pessoa ativa "Remover animações" no Android/iOS.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduce;
}

/** Entrada suave (sobe 10px e aparece). `delay` escalona itens de lista. */
export function FadeInView({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    Animated.timing(v, { toValue: 1, duration: 260, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduce, delay, v]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** "Pulo" curto para confirmar uma ação (curtir, confirmar presença). */
export function usePop() {
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const pop = () => {
    if (reduce) return;
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
    ]).start();
  };
  return { scale, pop };
}
