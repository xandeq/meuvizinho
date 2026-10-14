import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../lib/chat-store';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';

interface Props {
  conversationId: number;
}

export function MessageComposer({ conversationId }: Props) {
  const { colors } = useTheme();
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);
    try {
      await sendMessage(conversationId, body);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const handleAttach = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1920 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    setSending(true);
    try {
      await sendMessage(conversationId, text.trim(), {
        uri: manipulated.uri,
        name: `chat-${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      setText('');
    } catch {
      Alert.alert('Erro', 'Falha ao enviar imagem.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
      <Pressable
        style={styles.attachBtn}
        onPress={handleAttach}
        disabled={sending}
        accessibilityRole="button"
        accessibilityLabel="Anexar foto"
      >
        <Ionicons name="attach" size={22} color={colors.mutedFg} />
      </Pressable>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.fg, backgroundColor: colors.muted, borderRadius: radius.xl }]}
        value={text}
        onChangeText={setText}
        placeholder="Digite uma mensagem"
        placeholderTextColor={colors.mutedFg}
        multiline
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
        style={({ pressed }) => [
          styles.sendBtn,
          shadow.blue,
          { backgroundColor: colors.secondaryFill },
          (!text.trim() || sending) && { backgroundColor: colors.mutedFg, shadowOpacity: 0, elevation: 0 },
          pressed && !!text.trim() && !sending && { transform: [{ scale: 0.93 }] },
        ]}
        onPress={handleSend}
        disabled={!text.trim() || sending}
        hitSlop={4}
      >
        <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: -2 }} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 120,
    marginHorizontal: 6,
    fontFamily: fontFamily.regular,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
