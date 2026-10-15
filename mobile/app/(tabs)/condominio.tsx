import { View } from 'react-native';
import CondominiumsScreen from '../condominios/index';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useBairroName } from '../../src/lib/useBairroName';
import { useTheme } from '../../src/theme/ThemeContext';

// Aba "Condomínio": mesma tela da rota /condominios/index, agora na barra de baixo (igual ao site).
export default function CondominiumsScreenTab() {
  const { colors } = useTheme();
  const bairroName = useBairroName();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Condomínio" place={bairroName} />
      <CondominiumsScreen />
    </View>
  );
}
