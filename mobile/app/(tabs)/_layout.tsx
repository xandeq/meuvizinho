import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, type BottomTabsProps } from '../../src/navigation/BottomTabs';
import { useTheme } from '../../src/theme/ThemeContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tabs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabBar={(props) => <BottomTabs {...(props as unknown as BottomTabsProps)} />}
      screenOptions={{
        headerShown: false,
        // Tab screens have no native header, so push content below the status bar.
        sceneStyle: { paddingTop: insets.top, backgroundColor: colors.bg },
      }}
    >
      {/* Mesmos 5 destinos do site (menu do topo e barra mobile). */}
      <Tabs.Screen name="feed" options={{ title: 'Bairro' }} />
      <Tabs.Screen name="condominio" options={{ title: 'Condomínio' }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Mercado' }} />
      <Tabs.Screen name="alertas" options={{ title: 'Alertas' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      {/* Mapa e Grupos saem da barra: atalhos no cabeçalho do Bairro. */}
      <Tabs.Screen name="map" options={{ href: null }} />
      <Tabs.Screen name="groups/index" options={{ href: null }} />
      {/* Nested group routes live under the tab bar but must not become tabs. */}
      <Tabs.Screen name="groups/new" options={{ href: null }} />
      <Tabs.Screen name="groups/[groupId]" options={{ href: null }} />
    </Tabs>
  );
}
