import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { VerifiedBadge } from '../src/components/VerifiedBadge';
import { profileApi } from '../src/lib/api';
import type { ProfileDto } from '@bairronow/shared-types';

export default function Profile() {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await profileApi.getMe();
        setProfile(p);
        setDisplayName(p.displayName ?? '');
        setBio(p.bio ?? '');
      } catch (e: any) {
        Alert.alert('Erro', e?.message ?? 'Falha ao carregar perfil');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const p = await profileApi.updateMe({ displayName, bio, isBusinessAccount: profile?.isBusinessAccount ?? false });
      setProfile(p);
      Alert.alert('Sucesso', 'Perfil atualizado.');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message ?? e?.message ?? 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Meu perfil</Text>
      <View style={{ height: 8 }} />
      <VerifiedBadge verified={!!profile?.isVerified} />
      {profile?.bairroNome && (
        <Text style={styles.bairro}>📍 {profile.bairroNome}</Text>
      )}
      <View style={{ height: 24 }} />
      <Input
        label="Nome de exibição"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Como quer ser chamado"
      />
      <Input
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Conte algo sobre você"
        multiline
      />
      <Button title="Salvar" onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  bairro: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});
