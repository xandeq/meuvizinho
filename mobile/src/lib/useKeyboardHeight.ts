import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

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
