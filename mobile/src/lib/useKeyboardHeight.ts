import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, StatusBar, View } from 'react-native';

/**
 * Altura do teclado no Android. Com edge-to-edge, o KeyboardAvoidingView dentro de Modal
 * transparente não reage e o painel ficava inteiro atrás do teclado (visto no S23).
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Distância do topo do teclado até o fim da tela: inclui a barra de ferramentas do teclado
    // Samsung, que endCoordinates.height deixava de fora (o botão Publicar ficava meio coberto).
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setHeight(Math.max(e.endCoordinates.height, Dimensions.get('screen').height - e.endCoordinates.screenY)));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return height;
}

/**
 * Quanto o teclado cobre de uma view específica. Telas dentro das abas terminam acima da barra
 * de abas; descontar o teclado inteiro deixava uma folga do tamanho da barra (grupo, S23).
 * Uso: const { onLayout, ref, overlap } = useKeyboardOverlap(); <View ref={ref} onLayout={onLayout} style={{ paddingBottom: overlap }}>
 */
export function useKeyboardOverlap() {
  const keyboardHeight = useKeyboardHeight();
  const ref = useRef<View>(null);
  const [bottom, setBottom] = useState<number | null>(null);
  const onLayout = useCallback(() => {
    // measureInWindow no Android conta a partir de baixo da barra de status; o teclado (screenY)
    // conta do topo da tela. Sem somar, o recuo ficava curto exatamente nessa altura.
    const statusBar = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
    ref.current?.measureInWindow((_x, y, _w, h) => setBottom(y + h + statusBar));
  }, []);
  // Re-mede quando o teclado abre/fecha: a barra de abas some e a tela muda de tamanho.
  useEffect(() => {
    const t = setTimeout(onLayout, 50);
    return () => clearTimeout(t);
  }, [keyboardHeight, onLayout]);
  const screenH = Dimensions.get('screen').height;
  const overlap = keyboardHeight && bottom != null ? Math.max(0, bottom - (screenH - keyboardHeight)) : 0;
  return { ref, onLayout, overlap };
}
