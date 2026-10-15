import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../Button';
import { marketplaceApi } from '../../lib/api/marketplace';
import { ReportListingReason, REPORT_REASON_LABELS } from '../../lib/api/marketplace.types';
import { useTheme } from '../../theme/ThemeContext';
import { fontFamily, radius, shadow } from '../../theme/tokens';
import { useKeyboardHeight } from '../../lib/useKeyboardHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const keyboardHeight = useKeyboardHeight();
  // Sheet no fundo: sem o inset, os botões ficavam atrás da barra de navegação (edge-to-edge).
  const insets = useSafeAreaInsets();
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
      <Pressable accessibilityRole="button" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, shadow.ambientHigh, { backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, bottom: keyboardHeight, paddingBottom: 16 + (keyboardHeight ? 0 : insets.bottom) }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.fg }]}>Denunciar anúncio</Text>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
            <Ionicons name="close" size={18} color={colors.mutedFg} />
          </Pressable>
        </View>
        {reasons.map((r) => (
          <Pressable accessibilityRole="button"
            key={r}
            style={[
              styles.option,
              { borderColor: colors.border, borderRadius: radius.sm },
              reason === r && { borderColor: colors.secondary, backgroundColor: colors.secondaryLight },
            ]}
            onPress={() => setReason(r)}
          >
            <Text style={[styles.optionText, { color: colors.fg }, reason === r && { color: colors.secondary, fontFamily: fontFamily.bold }]}>
              {REPORT_REASON_LABELS[r]}
            </Text>
            <Ionicons
              name={reason === r ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={reason === r ? colors.secondary : colors.mutedFg}
            />
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
    paddingTop: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.bold, fontSize: 18 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionText: { fontFamily: fontFamily.semibold, fontSize: 14, flex: 1 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    padding: 10,
    marginVertical: 12,
    textAlignVertical: 'top',
    fontFamily: fontFamily.regular,
  },
});
