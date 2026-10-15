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
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius } from '../../theme/tokens';
import type { PostCategory, PostImageUpload } from '../../lib/api/feed';
import { useKeyboardHeight } from '../../lib/useKeyboardHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  onSubmit: (category: PostCategory, body: string, images: PostImageUpload[]) => Promise<void>;
}

const MAX_IMAGES = 4; // mesmo limite da API (PostService.MaxImages)

export function FeedComposer({ visible, onClose, onSubmit }: FeedComposerProps) {
  const { colors } = useTheme();
  const [category, setCategory] = useState<PostCategory>(4);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<PostImageUpload[]>([]);

  // Antes o app só publicava texto; a API e o site já aceitavam fotos.
  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permita o acesso às fotos para anexar imagens.');
      return;
    }
    const remaining = MAX_IMAGES - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;
    const picked: PostImageUpload[] = [];
    for (const asset of result.assets.slice(0, remaining)) {
      const out = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 1600 } }], {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      picked.push({ uri: out.uri, name: `foto-${Date.now()}-${picked.length}.jpg`, type: 'image/jpeg' });
    }
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
    setError(null);
  };

  const keyboardHeight = useKeyboardHeight();
  // Sheet no fundo: sem o inset, o rodapé ficava atrás da barra de navegação (edge-to-edge).
  const insets = useSafeAreaInsets();

  const discard = () => {
    setBody('');
    setCategory(4);
    setError(null);
    setImages([]);
    onClose();
  };

  // Voltar/fundo/X apagavam o texto sem perguntar.
  const handleClose = () => {
    if (submitting) return;
    if (!body.trim() && images.length === 0) return discard();
    Alert.alert('Descartar o post?', 'O texto que você escreveu será perdido.', [
      { text: 'Continuar escrevendo', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: discard },
    ]);
  };

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(category, body.trim(), images);
      setBody('');
      setCategory(4);
      setImages([]);
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
      <Pressable style={s.backdrop} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Fechar" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[s.sheetWrapper, Platform.OS === 'android' && { bottom: keyboardHeight }]}
      >
        <View style={[s.sheet, Platform.OS === 'android' && { paddingBottom: 20 + (keyboardHeight ? 0 : insets.bottom) }]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Title row */}
          <View style={s.titleRow}>
            <Text style={s.title}>Criar post</Text>
            <Pressable onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={colors.mutedFg} />
            </Pressable>
          </View>

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            {CATEGORIES.map((c) => (
              <Pressable accessibilityRole="button"
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
          {images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbs}>
              {images.map((img, i) => (
                <View key={img.uri} style={s.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={s.thumb} accessibilityIgnoresInvertColors />
                  <Pressable
                    onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover foto ${i + 1}`}
                    hitSlop={8}
                    style={s.thumbRemove}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={s.toolsRow}>
            <Pressable
              onPress={pickImages}
              disabled={images.length >= MAX_IMAGES || submitting}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar fotos, ${images.length} de ${MAX_IMAGES}`}
              style={[s.toolBtn, images.length >= MAX_IMAGES && { opacity: 0.4 }]}
            >
              <Ionicons name="image-outline" size={20} color={colors.primary} />
              <Text style={s.toolLabel}>Foto{images.length ? ` ${images.length}/${MAX_IMAGES}` : ''}</Text>
            </Pressable>
            <Text style={s.charCountInline}>{body.length}/1000</Text>
          </View>

          {error && <Text style={s.error}>{error}</Text>}

          {/* Submit */}
          <Pressable accessibilityRole="button"
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
    chipActive: { backgroundColor: colors.primaryFill, borderColor: colors.primary },
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
    charCountInline: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.mutedFg },
    toolsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
    toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
    toolLabel: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.fg },
    thumbs: { gap: 8, paddingTop: 10 },
    thumbWrap: { position: 'relative' },
    thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.muted },
    thumbRemove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(17,24,39,0.75)', alignItems: 'center', justifyContent: 'center' },
    error: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.danger, marginBottom: 10 },
    submitBtn: {
      backgroundColor: colors.primaryFill,
      borderRadius: radius.sm,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitLabel: { color: '#fff', fontFamily: fontFamily.extrabold, fontSize: 15 },
  });
