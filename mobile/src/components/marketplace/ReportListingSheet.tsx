import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert } from 'react-native';
import { Button } from '../Button';
import { marketplaceApi } from '../../lib/api/marketplace';
import { ReportListingReason, REPORT_REASON_LABELS } from '../../lib/api/marketplace.types';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius } from '../../theme/tokens';

interface Props {
  visible: boolean;
  listingId: number;
  onClose: () => void;
}

/**
 * D-20: Fixed list of 4 report reasons + optional details.
 */
export function ReportListingSheet({ visible, listingId, onClose }: Props) {
  const { colors } = useTheme();
  const [reason, setReason] = useState<ReportListingReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (reason == null) {
      Alert.alert('Selecione um motivo', 'Escolha uma das opções abaixo.');
      return;
    }
    setSubmitting(true);
    try {
      await marketplaceApi.report(listingId, reason, note || undefined);
      Alert.alert('Obrigado', 'Sua denúncia foi enviada para moderação.');
      setReason(null);
      setNote('');
      onClose();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível enviar a denúncia.');
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = Object.values(ReportListingReason).filter(
    (v) => typeof v === 'number'
  ) as ReportListingReason[];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }]}>
        <Text style={[styles.title, { color: colors.fg }]}>Denunciar anúncio</Text>
        {reasons.map((r) => (
          <Pressable
            key={r}
            style={[
              styles.option,
              { borderColor: colors.border, borderRadius: radius.sm },
              reason === r && { borderColor: colors.secondary, backgroundColor: colors.secondaryLight },
            ]}
            onPress={() => setReason(r)}
          >
            <Text style={[styles.optionText, { color: colors.fg }, reason === r && { color: colors.secondary }]}>
              {REPORT_REASON_LABELS[r]}
            </Text>
          </Pressable>
        ))}
        <TextInput
          style={[styles.input, { borderColor: colors.border, borderRadius: radius.sm, color: colors.fg }]}
          placeholder="Detalhes (opcional)"
          placeholderTextColor={colors.mutedFg}
          multiline
          value={note}
          onChangeText={setNote}
        />
        <Button title="Enviar denúncia" icon="flag" onPress={handleSubmit} loading={submitting} />
        <View style={{ height: 8 }} />
        <Button title="Cancelar" variant="outline" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  title: { fontFamily: fontFamily.bold, fontSize: 18, marginBottom: 12 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    padding: 10,
    marginVertical: 12,
    textAlignVertical: 'top',
    fontFamily: fontFamily.regular,
  },
});
