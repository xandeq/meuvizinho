import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius } from '../../theme/tokens';
import type { PostCategory } from '../../lib/api/feed';

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 4, label: 'Geral' },
  { value: 0, label: 'Dica' },
  { value: 2, label: 'Pergunta' },
  { value: 3, label: 'Evento' },
  { value: 1, label: 'Alerta' },
];

interface FeedComposerProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (category: PostCategory, body: string) => Promise<void>;
}

export function FeedComposer({ visible, onClose, onSubmit }: FeedComposerProps) {
  const { colors } = useTheme();
  const [category, setCategory] = useState<PostCategory>(4);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (submitting) return;
    setBody('');
    setCategory(4);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(category, body.trim());
      setBody('');
      setCategory(4);
      onClose();
    } catch {
      setError('Erro ao publicar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const s = styles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={s.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.sheetWrapper}
      >
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Title row */}
          <View style={s.titleRow}>
            <Text style={s.title}>Criar post</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.mutedFg} />
            </Pressable>
          </View>

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.value}
                style={[s.chip, category === c.value && s.chipActive]}
                onPress={() => setCategory(c.value)}
              >
                <Text style={[s.chipLabel, category === c.value && s.chipLabelActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Text input */}
          <TextInput
            style={s.input}
            placeholder="O que está acontecendo no bairro?"
            placeholderTextColor={colors.mutedFg}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1000}
            autoFocus
          />
          <Text style={s.charCount}>{body.length}/1000</Text>

          {error && <Text style={s.error}>{error}</Text>}

          {/* Submit */}
          <Pressable
            style={[s.submitBtn, (!body.trim() || submitting) && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!body.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.submitLabel}>Publicar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof import('../../theme/ThemeContext').useTheme>['colors']) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheetWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontFamily: fontFamily.extrabold, fontSize: 17, color: colors.fg },
    chipScroll: { marginBottom: 14 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radius.xl,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: colors.muted,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.mutedFg },
    chipLabelActive: { color: '#fff' },
    input: {
      backgroundColor: colors.muted,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 12,
      fontFamily: fontFamily.regular,
      fontSize: 15,
      color: colors.fg,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    charCount: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.mutedFg, textAlign: 'right', marginTop: 4, marginBottom: 12 },
    error: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.danger, marginBottom: 10 },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitLabel: { color: '#fff', fontFamily: fontFamily.extrabold, fontSize: 15 },
  });
