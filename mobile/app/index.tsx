import { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/Button';
import { useAuthStore } from '../src/lib/auth-store';

export default function Index() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) router.replace('/feed');
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      <Image source={require('../assets/brand/icon.png')} style={styles.logo} />
      <Text style={styles.title}>Meu Vizinho</Text>
      <Text style={styles.subtitle}>O bairro inteligente brasileiro</Text>
      <View style={{ height: 32 }} />
      <Button title="Entrar" onPress={() => router.push('/login')} />
      <View style={{ height: 12 }} />
      <Button title="Criar conta" variant="outline" onPress={() => router.push('/register')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  logo: { width: 96, height: 96, borderRadius: 16, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 4 },
});
