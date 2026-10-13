import { Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
    <Pressable onPress={toggleTheme} style={{ marginRight: 16 }}>
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
      <Pressable onPress={() => router.push('/settings')} style={{ marginRight: 16 }}>
        <Ionicons name="settings-outline" size={22} color={colors.fg} />
      </Pressable>
      <ThemeToggleButton />
    </View>
  );
}

function RootNavigator() {
  const { isDark, colors } = useTheme();
  usePushNotifications();

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
        <Stack.Screen name="index" options={{ title: 'Meu Vizinho' }} />
        <Stack.Screen name="login" options={{ title: 'Entrar' }} />
        <Stack.Screen name="register" options={{ title: 'Criar conta' }} />
        <Stack.Screen name="cep-lookup" options={{ title: 'Seu endereço' }} />
        <Stack.Screen name="proof-upload" options={{ title: 'Comprovante' }} />
        <Stack.Screen name="pending" options={{ title: 'Verificação' }} />
        <Stack.Screen name="magic-link" options={{ title: 'Link mágico' }} />
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
        <Stack.Screen name="condominios/[id]" options={{ title: 'Condomínio' }} />
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
