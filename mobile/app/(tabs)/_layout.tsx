import { Tabs } from 'expo-router';
import { BottomTabs, type BottomTabsProps } from '../../src/navigation/BottomTabs';

export default function TabsLayout() {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tabs tabBar={(props) => <BottomTabs {...(props as unknown as BottomTabsProps)} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="feed" options={{ title: 'Bairro' }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Mercado' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="map" options={{ title: 'Mapa' }} />
    </Tabs>
  );
}
