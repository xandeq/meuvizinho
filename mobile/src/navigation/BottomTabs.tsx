import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useChatStore } from '../lib/chat-store';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabRoute {
  key: string;
  name: string;
}

interface TabState {
  index: number;
  routes: TabRoute[];
}

interface TabNavigation {
  emit: (opts: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
  navigate: (name: string) => void;
}

export interface BottomTabsProps {
  state: TabState;
  navigation: TabNavigation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptors?: any;
}

const TAB_CONFIG: Record<string, { label: string; icon: string }> = {
  feed: { label: 'Bairro', icon: '🏘️' },
  marketplace: { label: 'Mercado', icon: '🛒' },
  chat: { label: 'Chat', icon: '💬' },
  map: { label: 'Mapa', icon: '🗺️' },
  'groups/index': { label: 'Grupos', icon: '👥' },
};

function getTabKey(routeName: string) {
  return routeName.replace('(tabs)/', '');
}

export function BottomTabs({ state, navigation, descriptors }: BottomTabsProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const unreadTotal = useChatStore((s) => s.unreadTotal);

  return (
    <View
      style={[
        styles.tabBar,
        // Edge-to-edge: keep the tabs above the gesture pill / 3-button nav bar.
        { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      {state.routes.map((route, index) => {
        const key = getTabKey(route.name);
        // Only whitelisted routes are tabs. Nested screens under (tabs)/ (groups/new,
        // groups/[groupId]) are auto-registered by expo-router and `href: null` is not
        // surfaced to a custom tabBar, so filter here.
        const config = TAB_CONFIG[key];
        if (!config || descriptors?.[route.key]?.options?.href === null) return null;
        const isFocused = state.index === index;
        const isChatTab = key === 'chat';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab}>
            <View>
              <Text style={[styles.icon, isFocused && styles.iconFocused]}>{config.icon}</Text>
              {isChatTab && unreadTotal > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeText}>{unreadTotal > 99 ? '99+' : unreadTotal}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: colors.mutedFg }, isFocused && { color: colors.primary, fontWeight: '700' }]}>
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  icon: { fontSize: 22, opacity: 0.5 },
  iconFocused: { opacity: 1 },
  label: { fontSize: 11, fontWeight: '500' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
