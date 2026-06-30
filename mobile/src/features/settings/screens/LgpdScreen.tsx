import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Share } from 'react-native';
import { Button } from '../../../components/Button';
import { apiClient } from '../../../lib/api';
import { useAuthStore } from '../../../lib/auth-store';
import { useTheme } from '../../../theme/ThemeContext';

export default function LgpdScreen() {
  const { colors } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await apiClient.get('/api/v1/account/export');
      const jsonStr = JSON.stringify(data, null, 2);

      // Share as text via system share sheet
      await Share.share({
        message: jsonStr,
        title: 'Meu Vizinho - Meus Dados',
      });
      Alert.alert('Sucesso', 'Dados exportados com sucesso.');
    } catch (e: any) {
      if (e?.response?.status === 429) {
        Alert.alert('Aguarde', 'Aguarde 24 horas entre exportacoes.');
      } else {
        Alert.alert('Erro', e?.response?.data?.error || 'Falha ao exportar dados');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRequest = () => {
    Alert.alert(
      'Excluir conta',
      'Seus dados serao anonimizados apos 30 dias. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiClient.post('/api/v1/account/delete');
              setDeleteRequested(true);
              Alert.alert(
                'Conta marcada para exclusao',
                'Seus dados serao anonimizados em 30 dias. Voce pode cancelar a exclusao ate la.',
              );
            } catch (e: any) {
              Alert.alert('Erro', e?.response?.data?.error || 'Falha ao solicitar exclusao');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelDeletion = async () => {
    setCanceling(true);
    try {
      await apiClient.post('/api/v1/account/delete/cancel');
      setDeleteRequested(false);
      Alert.alert('Exclusao cancelada', 'Sua conta foi restaurada.');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Falha ao cancelar exclusao');
    } finally {
      setCanceling(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.fg }]}>Meus Dados</Text>
      <Text style={[styles.description, { color: colors.muted }]}>
        De acordo com a Lei Geral de Protecao de Dados (LGPD), voce pode exportar ou solicitar a
        exclusao dos seus dados pessoais.
      </Text>

      {/* Export section */}
      <View style={[styles.section, { borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.fg }]}>Exportar Dados</Text>
        <Text style={[styles.sectionDesc, { color: colors.muted }]}>
          Baixe um arquivo JSON com todos os seus dados armazenados na plataforma.
        </Text>
        <View style={{ height: 12 }} />
        {exporting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Button title="Exportar meus dados" onPress={handleExport} />
        )}
      </View>

      {/* Delete section */}
      <View style={[styles.section, { borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>Excluir Conta</Text>
        <Text style={[styles.sectionDesc, { color: colors.muted }]}>
          Ao solicitar a exclusao, seus dados serao anonimizados apos 30 dias.
          Voce pode cancelar a exclusao durante esse periodo.
        </Text>
        <View style={{ height: 12 }} />
        {deleteRequested ? (
          <Button
            title="Cancelar exclusao"
            variant="outline"
            onPress={handleCancelDeletion}
            loading={canceling}
          />
        ) : (
          <Button
            title="Solicitar exclusao da conta"
            onPress={handleDeleteRequest}
            loading={deleting}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { fontSize: 13, lineHeight: 18 },
});
