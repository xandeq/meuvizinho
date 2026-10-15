import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { EmptyState } from '../src/components/EmptyState';
import { useTheme } from '../src/theme/ThemeContext';

// Antes: link quebrado (notificação antiga, link compartilhado) abria a tela padrão do Expo,
// em inglês ("Unmatched Route") e com link para o sitemap de desenvolvimento.
export default function NotFound() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <EmptyState
        icon="compass-outline"
        title="Não encontramos essa página"
        subtitle="O link pode estar desatualizado ou o conteúdo foi removido."
        actionLabel="Voltar ao início"
        actionIcon="home-outline"
        onAction={() => router.replace('/')}
      />
    </View>
  );
}
