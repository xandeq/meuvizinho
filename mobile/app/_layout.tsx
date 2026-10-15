import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../src/lib/auth-store';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { fontFamily } from '../src/theme/tokens';
import { usePushNotifications } from '../src/lib/usePushNotifications';

function ThemeToggleButton() {
  const { isDark, toggleTheme, colors } = useTheme();
  return (
    <Pressable
      onPress={toggleTheme}
      style={{ marginRight: 16 }}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
    >
      <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.fg} />
    </Pressable>
  );
}

// 'settings' was only reachable by typing the URL — there was no in-app entry point,
// so it added a settings icon here alongside the existing theme toggle.
function ProfileHeaderRight() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        onPress={() => router.push('/settings')}
        style={{ marginRight: 16 }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Configurações"
      >
        <Ionicons name="settings-outline" size={22} color={colors.fg} />
      </Pressable>
      <ThemeToggleButton />
    </View>
  );
}

// Sessão caiu (refresh falhou) em qualquer tela logada: volta pro login, que
// explica o motivo. Antes o app ficava nas abas sem usuário e o feed dizia
// "Complete sua verificação" para quem já era verificado.
function useSessionExpiredRedirect() {
  const router = useRouter();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  // Só na transição: no cold start o valor persistido já cai na tela de boas-vindas,
  // e navegar imperativamente antes do layout montar já derrubou o app antes.
  const prev = useRef(sessionExpired);
  useEffect(() => {
    if (sessionExpired && !prev.current) router.replace('/login');
    prev.current = sessionExpired;
  }, [sessionExpired, router]);
}

function RootNavigator() {
  const { isDark, colors } = useTheme();
  usePushNotifications();
  useSessionExpiredRedirect();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.fg,
          headerTitleStyle: { fontFamily: fontFamily.bold },
          headerRight: () => <ThemeToggleButton />,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* Auth screens */}
        <Stack.Screen name="index" options={{ title: '', headerShadowVisible: false }} />
        <Stack.Screen name="login" options={{ title: '', headerShadowVisible: false }} />
        <Stack.Screen name="register" options={{ title: '', headerShadowVisible: false }} />
        <Stack.Screen name="cep-lookup" options={{ title: '', headerShadowVisible: false }} />
        <Stack.Screen name="proof-upload" options={{ title: '', headerShadowVisible: false }} />
        <Stack.Screen name="pending" options={{ title: '', headerShadowVisible: false }} />
        <Stack.Screen name="magic-link" options={{ title: '', headerShadowVisible: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        {/* Authenticated -- tabs with persistent bottom nav */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Profile (outside tabs) */}
        <Stack.Screen name="profile" options={{ title: 'Meu perfil', headerRight: () => <ProfileHeaderRight /> }} />
        {/* Settings */}
        <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
        <Stack.Screen name="lgpd" options={{ title: 'Meus Dados (LGPD)' }} />
        <Stack.Screen name="premium" options={{ title: 'Meu Vizinho Premium' }} />
        {/* Deep routes rendered above tab bar */}
        <Stack.Screen name="marketplace/new" options={{ title: 'Novo anúncio' }} />
        <Stack.Screen name="marketplace/[id]" options={{ title: 'Anúncio' }} />
        <Stack.Screen name="marketplace/edit/[id]" options={{ title: 'Editar anúncio' }} />
        <Stack.Screen name="marketplace/search" options={{ title: 'Buscar' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        {/* Comunidade: grupos WhatsApp, condomínios/síndico, alertas de segurança */}
        <Stack.Screen name="whatsapp/index" options={{ title: 'Grupos de WhatsApp' }} />
        <Stack.Screen name="whatsapp/new" options={{ title: 'Indicar grupo' }} />
        <Stack.Screen name="condominios/index" options={{ title: 'Condomínios' }} />
        <Stack.Screen name="condominios/[id]/index" options={{ title: 'Condomínio' }} />
        <Stack.Screen name="condominios/[id]/comunicados" options={{ title: 'Comunicados' }} />
        <Stack.Screen name="condominios/[id]/comunicado/[announcementId]" options={{ title: 'Comunicado' }} />
        <Stack.Screen name="condominios/[id]/areas" options={{ title: 'Áreas comuns' }} />
        <Stack.Screen name="condominios/[id]/area/[areaId]" options={{ title: 'Reservar' }} />
        <Stack.Screen name="condominios/[id]/reservas" options={{ title: 'Minhas reservas' }} />
        <Stack.Screen name="condominios/[id]/ocorrencias" options={{ title: 'Ocorrências' }} />
        <Stack.Screen name="condominios/[id]/ocorrencia/nova" options={{ title: 'Nova ocorrência' }} />
        <Stack.Screen name="condominios/[id]/ocorrencia/[incidentId]" options={{ title: 'Ocorrência' }} />
        <Stack.Screen name="alertas/index" options={{ title: 'Alertas de Segurança' }} />
        <Stack.Screen name="alertas/new" options={{ title: 'Reportar ocorrência' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />;
  }

  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
