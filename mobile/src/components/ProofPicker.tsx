import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Button } from './Button';
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

  return (
    <View>
      <Button title="Escolher foto" icon="images" variant="outline" onPress={pickFromLibrary} />
      <View style={{ height: 12 }} />
      <Button title="Tirar foto" icon="camera" variant="outline" onPress={takePhoto} />
      <View style={{ height: 12 }} />
      <Button title="Enviar PDF" icon="document-text" variant="outline" onPress={pickPdf} />
      {previewUri && (
        <Image source={{ uri: previewUri }} style={[styles.preview, { backgroundColor: colors.muted, borderRadius: radius.sm }]} />
      )}
      <Text style={[styles.hint, { color: colors.mutedFg }]}>Tamanho máximo: 5 MB</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 240, marginTop: 16 },
  hint: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 8 },
});
