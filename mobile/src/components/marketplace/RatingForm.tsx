import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../Button';
import { marketplaceApi } from '../../lib/api/marketplace';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';

interface Props {
  sellerId: string;
  listingId: number;
  onSubmitted: () => void;
}

export function RatingForm({ sellerId, listingId, onSubmitted }: Props) {
  const { colors } = useTheme();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (stars < 1) {
      Alert.alert('Nota obrigatória', 'Selecione de 1 a 5 estrelas.');
      return;
    }
    setSubmitting(true);
    try {
      await marketplaceApi.createRating(sellerId, { stars, comment, listingId });
      Alert.alert('Obrigado', 'Sua avaliação foi registrada.');
      onSubmitted();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível enviar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, shadow.ambientLow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
      <Text style={[styles.label, { color: colors.fg }]}>Avalie o vendedor</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} style={styles.star}>
            <Ionicons
              name={n <= stars ? 'star' : 'star-outline'}
              size={32}
              color={n <= stars ? colors.accent : colors.border}
            />
          </Pressable>
        ))}
      </View>
      <TextInput
        style={[styles.input, { borderColor: colors.border, borderRadius: radius.sm, color: colors.fg }]}
        placeholder="Comentário (opcional)"
        placeholderTextColor={colors.mutedFg}
        multiline
        value={comment}
        onChangeText={setComment}
      />
      <Button title="Enviar avaliação" icon="checkmark-circle" onPress={handleSubmit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, marginVertical: 12, borderWidth: 1 },
  label: { fontFamily: fontFamily.bold, fontSize: 14, marginBottom: 8 },
  starsRow: { flexDirection: 'row', marginBottom: 10, gap: 4 },
  star: { paddingHorizontal: 4 },
  input: {
    minHeight: 60,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    textAlignVertical: 'top',
    fontFamily: fontFamily.regular,
  },
});
