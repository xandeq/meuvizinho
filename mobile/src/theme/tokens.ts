import { Platform } from 'react-native';

export const fontFamily = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  '2xl': 32,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

/**
 * Elevation unificada com o web (DESIGN.md §4). Cada nível vira um objeto de
 * estilo RN pronto (iOS: shadow*; Android: elevation), pra não duplicar a
 * conta em cada componente.
 */
function makeShadow(color: string, opacity: number, radiusPx: number, elevation: number, offsetY = 2) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation },
    default: {},
  }) as object;
}

export const shadow = {
  ambientLow: makeShadow('#0F172A', 0.06, 2, 2, 1),
  ambientMid: makeShadow('#0F172A', 0.08, 12, 4, 4),
  ambientHigh: makeShadow('#0F172A', 0.12, 32, 8, 12),
  blue: makeShadow('#2563EB', 0.25, 14, 5, 4),
  emerald: makeShadow('#059669', 0.25, 14, 5, 4),
};
