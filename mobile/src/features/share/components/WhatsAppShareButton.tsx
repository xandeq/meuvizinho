import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareToWhatsApp } from '../utils/share';

interface Props {
  url: string;
  text?: string;
}

export default function WhatsAppShareButton({ url, text = 'Veja este post no Meu Vizinho' }: Props) {
  return (
    <TouchableOpacity
      onPress={() => shareToWhatsApp(url, text)}
      style={styles.button}
    >
      <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 6 }} />
      <Text style={styles.text}>WhatsApp</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#25D366',
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
