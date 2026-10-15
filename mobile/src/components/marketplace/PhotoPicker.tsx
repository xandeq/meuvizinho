import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../Button';
import type { ListingPhotoAsset } from '../../lib/api/marketplace.types';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius } from '../../theme/tokens';

interface Props {
  photos: ListingPhotoAsset[];
  onChange: (photos: ListingPhotoAsset[]) => void;
  max?: number;
}

/**
 * PhotoPicker — replicates the Phase 02-03 ProofPicker pipeline for marketplace listings.
 * D-01: min 1, max 6 photos; first photo is marked "Capa" automatically.
 */
export function PhotoPicker({ photos, onChange, max = 6 }: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const remaining = max - photos.length;

  const pickImages = async () => {
    if (remaining <= 0) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'Conceda acesso às suas fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;
    setBusy(true);
    try {
      const processed: ListingPhotoAsset[] = [];
      for (const asset of result.assets) {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1920 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
        processed.push({
          uri: manipulated.uri,
          name: `listing-${Date.now()}-${processed.length}.jpg`,
          type: 'image/jpeg',
        });
      }
      onChange([...photos, ...processed].slice(0, max));
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (idx: number) => {
    const next = photos.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = photos.slice();
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  };

  return (
    <View>
      <Text style={[styles.label, { color: colors.fg }]}>Fotos ({photos.length}/{max})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {photos.map((p, idx) => (
          <View key={p.uri} style={[styles.thumbWrap, { borderRadius: radius.sm, backgroundColor: colors.muted }]}>
            <Image source={{ uri: p.uri }} style={styles.thumb} />
            {idx === 0 && (
              <View style={[styles.capaBadge, { backgroundColor: colors.primaryFill }]}>
                <Text style={styles.capaText}>Capa</Text>
              </View>
            )}
            <View style={styles.thumbActions}>
              {idx > 0 && (
                <Pressable onPress={() => moveUp(idx)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Mover foto para cima">
                  <Ionicons name="arrow-up" size={13} color="#fff" />
                </Pressable>
              )}
              <Pressable
                onPress={() => removeAt(idx)}
                style={[styles.iconBtn, { backgroundColor: 'rgba(220,38,38,0.9)' }]}
                accessibilityRole="button"
                accessibilityLabel="Remover foto"
              >
                <Ionicons name="close" size={13} color="#fff" />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <Button
        title={busy ? 'Processando…' : `Adicionar fotos (${remaining} restantes)`}
        icon="images"
        variant="outline"
        onPress={pickImages}
        disabled={busy || remaining <= 0}
      />
      <Text style={[styles.hint, { color: colors.mutedFg }]}>Mínimo 1, máximo {max}. A primeira foto é a capa.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fontFamily.bold, fontSize: 14, marginBottom: 8 },
  row: { marginBottom: 12 },
  thumbWrap: {
    width: 96,
    height: 96,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  capaBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  capaText: { color: '#fff', fontFamily: fontFamily.bold, fontSize: 10 },
  thumbActions: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(17,24,39,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  hint: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 6 },
});
