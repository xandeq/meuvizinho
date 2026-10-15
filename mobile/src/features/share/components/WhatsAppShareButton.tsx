import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareToWhatsApp } from '../utils/share';
import { fontFamily, radius } from '../../../theme/tokens';
import { useTheme } from '../../../theme/ThemeContext';

interface Props {
  url: string;
  text?: string;
}

// Antes: texto branco sobre o verde do WhatsApp (#25D366, ~2:1 de contraste) e rótulo só
// "WhatsApp". Agora contornado como os outros botões; o verde fica só no logo.
export default function WhatsAppShareButton({ url, text = 'Veja este post no Meu Vizinho' }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Compartilhar no WhatsApp"
      onPress={() => shareToWhatsApp(url, text)}
      style={({ pressed }) => [styles.button, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: colors.fg }]}>Compartilhar no WhatsApp</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  text: { fontFamily: fontFamily.semibold, fontSize: 15 },
});
