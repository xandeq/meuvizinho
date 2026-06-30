import { Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { usePushNotifications } from '../src/lib/usePushNotifications';

function ThemeToggleButton() {
  const { isDark, toggleTheme, colors } = useTheme();
  return (
    <Pressable onPress={toggleTheme} style={{ marginRight: 16 }}>
      <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.fg} />
    </Pressable>
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
          headerRight: () => <ThemeToggleButton />,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* Auth screens */}
        <Stack.Screen name="index" options={{ title: 'Meu Vizinho' }} />
        <Stack.Screen name="login" options={{ title: 'Entrar' }} />
        <Stack.Screen name="register" options={{ title: 'Criar conta' }} />
        <Stack.Screen name="cep-lookup" options={{ title: 'Seu endereco' }} />
        <Stack.Screen name="proof-upload" options={{ title: 'Comprovante' }} />
        <Stack.Screen name="pending" options={{ title: 'Verificacao' }} />
        <Stack.Screen name="magic-link" options={{ title: 'Link magico' }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        {/* Authenticated -- tabs with persistent bottom nav */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Profile (outside tabs) */}
        <Stack.Screen name="profile" options={{ title: 'Meu perfil' }} />
        {/* Settings */}
        <Stack.Screen name="settings" options={{ title: 'Configuracoes' }} />
        <Stack.Screen name="lgpd" options={{ title: 'Meus Dados (LGPD)' }} />
        {/* Deep routes rendered above tab bar */}
        <Stack.Screen name="marketplace/new" options={{ title: 'Novo anuncio' }} />
        <Stack.Screen name="marketplace/[id]" options={{ title: 'Anuncio' }} />
        <Stack.Screen name="marketplace/edit/[id]" options={{ title: 'Editar anuncio' }} />
        <Stack.Screen name="marketplace/search" options={{ title: 'Buscar' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
