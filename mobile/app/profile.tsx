import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { VerifiedBadge } from '../src/components/VerifiedBadge';
import { profileApi } from '../src/lib/api';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily } from '../src/theme/tokens';
import type { ProfileDto } from '@bairronow/shared-types';

export default function Profile() {
  const { colors } = useTheme();
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
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.fg }]}>Meu perfil</Text>
      <View style={{ height: 8 }} />
      <VerifiedBadge verified={!!profile?.isVerified} />
      {profile?.bairroNome && (
        <View style={styles.bairroRow}>
          <Ionicons name="location" size={14} color={colors.mutedFg} />
          <Text style={[styles.bairro, { color: colors.mutedFg }]}>{profile.bairroNome}</Text>
        </View>
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
      <Button title="Salvar" icon="checkmark" onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: fontFamily.extrabold, fontSize: 28 },
  bairroRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  bairro: { fontFamily: fontFamily.regular, fontSize: 14 },
});
