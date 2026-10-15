import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { VerifiedBadge } from '../src/components/VerifiedBadge';
import { profileApi } from '../src/lib/api';
import { useAuthStore } from '../src/lib/auth-store';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily, radius, shadow } from '../src/theme/tokens';
import type { ProfileDto } from '@bairronow/shared-types';

const BIO_MAX = 160;

function initialsOf(name: string | null | undefined, fallback: string): string {
  const src = (name ?? '').trim() || fallback;
  return (
    src
      .split(/\s+/)
      .filter((w) => /^[\p{L}]/u.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function Profile() {
  const { colors } = useTheme();
  const email = useAuthStore((s) => s.user?.email ?? '');
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const dirty = !!profile && (displayName !== (profile.displayName ?? '') || bio !== (profile.bio ?? ''));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Manda de volta os dados de negócio: o PUT substitui tudo e o app apagava o que foi
      // preenchido no site (nome, categoria, telefone...) a cada vez que salvava o nome.
      const p = await profileApi.updateMe({
        displayName,
        bio,
        isBusinessAccount: profile?.isBusinessAccount ?? false,
        businessName: profile?.businessName ?? undefined,
        businessCategory: profile?.businessCategory ?? undefined,
        businessDescription: profile?.businessDescription ?? undefined,
        businessPhone: profile?.businessPhone ?? undefined,
        businessWebsite: profile?.businessWebsite ?? undefined,
      });
      setProfile(p);
      // Confirmação inline no lugar de um alerta modal.
      setSaved(true);
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
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.hero, shadow.ambientLow, { backgroundColor: colors.card }]}>
        {profile?.photoUrl ? (
          <Image source={{ uri: profile.photoUrl }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primaryFill }]}>
            <Text style={styles.avatarText}>{initialsOf(profile?.displayName, email)}</Text>
          </View>
        )}
        <Text style={[styles.name, { color: colors.fg }]} numberOfLines={1}>
          {profile?.displayName?.trim() || 'Seu nome'}
        </Text>
        <View style={styles.badges}>
          <VerifiedBadge verified={!!profile?.isVerified} />
          {profile?.bairroNome ? (
            <View style={[styles.place, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="location" size={13} color={colors.primary} />
              <Text style={[styles.placeText, { color: colors.primary }]}>{profile.bairroNome}</Text>
            </View>
          ) : null}
        </View>
        {profile?.bio ? (
          <Text style={[styles.bioPreview, { color: colors.mutedFg }]} numberOfLines={3}>{profile.bio}</Text>
        ) : null}
      </View>

      <Text style={[styles.section, { color: colors.mutedFg }]}>Como os vizinhos te veem</Text>
      <View style={[styles.form, { backgroundColor: colors.card }]}>
        <Input
          label="Nome de exibição"
          value={displayName}
          onChangeText={(t) => {
            setDisplayName(t);
            setSaved(false);
          }}
          placeholder="Ex.: Ana do 302"
        />
        <Input
          label={`Bio (${bio.length}/${BIO_MAX})`}
          value={bio}
          onChangeText={(t) => {
            setBio(t.slice(0, BIO_MAX));
            setSaved(false);
          }}
          placeholder="Conte algo sobre você: tempo no bairro, o que faz, se tem pet…"
          multiline
        />
        {saved && !dirty ? (
          <View style={[styles.savedRow, { backgroundColor: colors.primaryLight }]} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={[styles.savedText, { color: colors.primary }]}>Perfil atualizado</Text>
          </View>
        ) : null}
        <Button title="Salvar alterações" icon="checkmark" onPress={save} loading={saving} disabled={!dirty} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { borderRadius: radius.lg, padding: 20, alignItems: 'center' },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: fontFamily.extrabold, fontSize: 30 },
  name: { fontFamily: fontFamily.extrabold, fontSize: 22, marginTop: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.xl },
  placeText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  bioPreview: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 12 },
  section: { fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  form: { borderRadius: radius.lg, padding: 16 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: radius.sm, marginBottom: 12 },
  savedText: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
