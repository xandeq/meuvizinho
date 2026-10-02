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
      <Tabs.Screen name="feed" options={{ title: 'Bairro' }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Mercado' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="map" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="groups/index" options={{ title: 'Grupos' }} />
      {/* Nested group routes live under the tab bar but must not become tabs. */}
      <Tabs.Screen name="groups/new" options={{ href: null }} />
      <Tabs.Screen name="groups/[groupId]" options={{ href: null }} />
    </Tabs>
  );
}
