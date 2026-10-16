import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../Button';
import { marketplaceApi } from '../../lib/api/marketplace';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';
import { apiErrorMessage } from '../../lib/apiError';

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
  // Depois de avaliar o formulário continuava ali e um 2º envio dava erro genérico.
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (stars < 1) {
      Alert.alert('Nota obrigatória', 'Selecione de 1 a 5 estrelas.');
      return;
    }
    setSubmitting(true);
    try {
      await marketplaceApi.createRating(sellerId, { stars, comment, listingId });
      setDone(true);
      onSubmitted();
    } catch (err) {
      // Mostra o motivo real (ex.: "Você já avaliou este anúncio.").
      Alert.alert('Não foi possível avaliar', apiErrorMessage(err, 'Tente de novo em instantes.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: 8 }]} accessibilityLiveRegion="polite">
        <Ionicons name="checkmark-circle" size={20} color={colors.verified} />
        <Text style={[styles.label, { color: colors.fg, marginBottom: 0 }]}>Obrigado! Sua avaliação foi registrada.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, shadow.ambientLow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md }]}>
      <Text style={[styles.label, { color: colors.fg }]}>Avalie o vendedor</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
            accessibilityState={{ selected: n === stars }}
            key={n}
            onPress={() => setStars(n)}
            style={styles.star}
          >
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
