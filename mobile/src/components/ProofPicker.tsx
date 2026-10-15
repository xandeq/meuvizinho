import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, radius } from '../theme/tokens';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface Props {
  onFile: (file: PickedFile) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

function guessNameFromUri(uri: string, fallback: string): string {
  const last = uri.split('/').pop();
  return last && last.length ? last : fallback;
}

export function ProofPicker({ onFile }: Props) {
  const { colors } = useTheme();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(null);

  const handleAsset = async (
    uri: string,
    fileSize: number | undefined,
    mime: string,
    name: string
  ) => {
    if (fileSize && fileSize > MAX_BYTES) {
      Alert.alert('Arquivo muito grande', 'O comprovante deve ter no máximo 5 MB.');
      return;
    }
    setPreviewUri(mime.startsWith('image/') ? uri : null);
    setPicked({ name, size: fileSize ?? 0 });
    onFile({ uri, name, type: mime, size: fileSize ?? 0 });
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Conceda acesso às suas fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const compressed = await compressImage(asset.uri);
    await handleAsset(
      compressed,
      asset.fileSize,
      'image/jpeg',
      guessNameFromUri(compressed, 'comprovante.jpg')
    );
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Conceda acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const compressed = await compressImage(asset.uri);
    await handleAsset(
      compressed,
      asset.fileSize,
      'image/jpeg',
      guessNameFromUri(compressed, 'comprovante.jpg')
    );
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await handleAsset(
      asset.uri,
      asset.size,
      asset.mimeType ?? 'application/pdf',
      asset.name ?? 'comprovante.pdf'
    );
  };

  // Antes: três botões grandes sempre à vista e a prévia aparecia lá embaixo, cortada, com o
  // "Enviar" fora da tela. Agora: opções compactas e, depois de escolher, o cartão do arquivo.
  if (picked) {
    return (
      <View style={[styles.pickedCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={[styles.thumb, { backgroundColor: colors.muted }]} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.thumb, styles.docThumb, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="document-text" size={28} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.pickedTitle, { color: colors.fg }]}>Comprovante escolhido</Text>
          <Text style={[styles.pickedMeta, { color: colors.mutedFg }]} numberOfLines={1}>
            {picked.name}{picked.size ? ` · ${Math.max(1, Math.round(picked.size / 1024))} KB` : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => { setPicked(null); setPreviewUri(null); }}
          accessibilityRole="button"
          accessibilityLabel="Trocar comprovante"
          hitSlop={10}
        >
          <Text style={[styles.change, { color: colors.primary }]}>Trocar</Text>
        </Pressable>
      </View>
    );
  }

  const options: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; a11y: string }[] = [
    { label: 'Galeria', icon: 'images-outline', onPress: pickFromLibrary, a11y: 'Escolher foto da galeria' },
    { label: 'Câmera', icon: 'camera-outline', onPress: takePhoto, a11y: 'Tirar foto do comprovante' },
    { label: 'PDF', icon: 'document-text-outline', onPress: pickPdf, a11y: 'Enviar PDF' },
  ];
  return (
    <View>
      <View style={styles.options}>
        {options.map((o) => (
          <Pressable
            key={o.label}
            onPress={o.onPress}
            accessibilityRole="button"
            accessibilityLabel={o.a11y}
            style={({ pressed }) => [
              styles.option,
              { borderColor: colors.primaryFill, backgroundColor: colors.card, borderRadius: radius.md, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name={o.icon} size={26} color={colors.primary} />
            <Text style={[styles.optionText, { color: colors.fg }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.hint, { color: colors.mutedFg }]}>Foto nítida do documento inteiro. Máximo 5 MB.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, minHeight: 88, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 6 },
  optionText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  hint: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 10 },
  pickedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  thumb: { width: 64, height: 84, borderRadius: 8 },
  docThumb: { alignItems: 'center', justifyContent: 'center' },
  pickedTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  pickedMeta: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 2 },
  change: { fontFamily: fontFamily.semibold, fontSize: 15 },
});
