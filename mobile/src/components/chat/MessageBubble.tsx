import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';
import type { MessageDto } from '../../lib/api/chat';

interface Props {
  message: MessageDto;
  isOwn: boolean;
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageBubble({ message, isOwn }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          shadow.ambientLow,
          { backgroundColor: isOwn ? colors.secondary : colors.card },
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
        ]}
      >
        {message.imageUrl && (
          <Image source={{ uri: message.imageUrl }} style={styles.image} />
        )}
        {!!message.text && (
          <Text style={[styles.text, { color: isOwn ? '#fff' : colors.fg }]}>{message.text}</Text>
        )}
        <Text style={[styles.time, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.mutedFg }]}>
          {formatTime(message.sentAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 12 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
  },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  text: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 20 },
  image: { width: 220, height: 220, borderRadius: radius.sm, marginBottom: 6 },
  time: { fontFamily: fontFamily.regular, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
});
