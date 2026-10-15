import { View } from 'react-native';
import AlertasScreen from '../alertas/index';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useBairroName } from '../../src/lib/useBairroName';
import { useTheme } from '../../src/theme/ThemeContext';

// Aba "Alertas": mesma tela da rota /alertas/index, agora na barra de baixo (igual ao site).
export default function AlertasScreenTab() {
  const { colors } = useTheme();
  const bairroName = useBairroName();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Alertas" place={bairroName} />
      <AlertasScreen />
    </View>
  );
}
