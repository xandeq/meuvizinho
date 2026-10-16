import { useEffect } from 'react';
import { Animated, AppState, View, Text, Pressable, StyleSheet } from 'react-native';
import { usePop } from '../lib/motion';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../lib/chat-store';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily, shadow } from '../theme/tokens';
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

const TAB_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }> = {
  feed: { label: 'Bairro', icon: 'home-outline', iconFocused: 'home' },
  marketplace: { label: 'Mercado', icon: 'storefront-outline', iconFocused: 'storefront' },
  chat: { label: 'Chat', icon: 'chatbubble-outline', iconFocused: 'chatbubble' },
  condominio: { label: 'Condomínio', icon: 'business-outline', iconFocused: 'business' },
  alertas: { label: 'Alertas', icon: 'warning-outline', iconFocused: 'warning' },
};

function getTabKey(routeName: string) {
  return routeName.replace('(tabs)/', '');
}

export function BottomTabs({ state, navigation, descriptors }: BottomTabsProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const unreadTotal = useChatStore((s) => s.unreadTotal);

  // O selo só aparecia depois de abrir a aba Chat. Carrega ao entrar, liga o tempo real e
  // atualiza ao voltar do segundo plano.
  useEffect(() => {
    const { loadUnreadCount, connect } = useChatStore.getState();
    loadUnreadCount();
    connect();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') useChatStore.getState().loadUnreadCount();
    });
    return () => sub.remove();
  }, []);

  return (
    <View
      style={[
        styles.tabBar,
        shadow.ambientMid,
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
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={
              isChatTab && unreadTotal > 0 ? `${config.label}, ${unreadTotal} ${unreadTotal === 1 ? "mensagem não lida" : "mensagens não lidas"}` : config.label
            }
          >
            <View>
              <TabIcon
                focused={isFocused}
                name={isFocused ? config.iconFocused : config.icon}
                color={isFocused ? colors.primary : colors.mutedFg}
                pillColor={colors.primaryLight}
              />
              {isChatTab && unreadTotal > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.dangerFill }]}>
                  <Text style={styles.badgeText}>{unreadTotal > 99 ? '99+' : unreadTotal}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: colors.mutedFg }, isFocused && { color: colors.primary, fontFamily: fontFamily.bold }]}>
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Aba ativa: pílula de fundo + "pulo" curto ao trocar. Antes só a cor mudava.
function TabIcon({ focused, name, color, pillColor }: { focused: boolean; name: any; color: string; pillColor: string }) {
  const { scale, pop } = usePop();
  useEffect(() => { if (focused) pop(); }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[styles.pill, focused && { backgroundColor: pillColor }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={name} size={23} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48 },
  label: { fontSize: 12, fontFamily: fontFamily.medium },
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
