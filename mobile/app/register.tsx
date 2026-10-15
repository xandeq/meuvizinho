import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { registerSchema, type RegisterInput } from '@bairronow/shared-validators';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { PasswordChecklist } from '../src/components/PasswordChecklist';
import { authApi } from '../src/lib/api';
import { useAuthStore } from '../src/lib/auth-store';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily, radius } from '../src/theme/tokens';

export default function Register() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { email: '', password: '', confirmPassword: '', acceptedPrivacyPolicy: false as any },
  });

  const password = watch('password') ?? '';

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    try {
      const res = await authApi.register({ ...data, acceptedPrivacyPolicy: true });
      login(res.accessToken, res.user);
      router.replace('/cep-lookup');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.error || 'Falha ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.fg }]}>Criar conta</Text>
      <Text style={[styles.subtitle, { color: colors.mutedFg }]}>Junte-se ao seu bairro</Text>
      <View style={{ height: 24 }} />
      <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
        <Input label="E-mail" value={value} onChangeText={onChange} keyboardType="email-address" placeholder="voce@exemplo.com" error={errors.email?.message} />
      )} />
      <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
        <Input label="Senha" value={value} onChangeText={onChange} secureTextEntry placeholder="Crie uma senha" textContentType="newPassword" autoComplete="password-new" error={errors.password?.message} />
      )} />
      <PasswordChecklist value={password} />
      <Controller control={control} name="confirmPassword" render={({ field: { onChange, value } }) => (
        <Input label="Confirme a senha" value={value} onChangeText={onChange} secureTextEntry placeholder="Repita a senha" textContentType="newPassword" error={errors.confirmPassword?.message} />
      )} />
      <Controller control={control} name="acceptedPrivacyPolicy" render={({ field: { onChange, value } }) => (
        <>
          <Pressable
            style={styles.checkboxRow}
            onPress={() => onChange(!value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!value }}
            accessibilityLabel="Aceito a política de privacidade"
          >
            <View style={[
              styles.checkbox,
              { borderRadius: radius.xs, borderColor: colors.primary },
              value && { backgroundColor: colors.primaryFill, borderColor: colors.primaryFill },
            ]}>
              {value ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </View>
            <Text style={[styles.checkboxText, { color: colors.fg }]}>Aceito a política de privacidade</Text>
          </Pressable>
          {/* Link separado: dentro do rótulo ele roubava o toque de quem queria marcar a caixa. */}
          <Text
            onPress={() => Linking.openURL('https://meuvizinhoapp.com.br/privacy-policy/')}
            accessibilityRole="link"
            style={[styles.policyLink, { color: colors.primary }]}
          >
            Ler a política de privacidade
          </Text>
          {errors.acceptedPrivacyPolicy ? <Text style={[styles.error, { color: colors.danger }]}>{errors.acceptedPrivacyPolicy.message}</Text> : null}
        </>
      )} />
      <View style={{ height: 16 }} />
      <Button title="Criar conta" icon="person-add" onPress={handleSubmit(onSubmit)} loading={loading} />
      <Pressable onPress={() => router.replace('/login')} hitSlop={8} style={styles.loginLink} accessibilityRole="link">
        <Text style={[styles.loginLinkText, { color: colors.mutedFg }]}>
          Já tem conta? <Text style={{ color: colors.primary, fontFamily: fontFamily.semibold }}>Entrar</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 28 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, minHeight: 44 },
  checkbox: { width: 24, height: 24, borderWidth: 2, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21 },
  loginLink: { alignSelf: 'center', marginTop: 20, paddingVertical: 8 },
  policyLink: { marginLeft: 36, marginTop: 4, paddingVertical: 6, fontFamily: fontFamily.semibold, fontSize: 14 },
  loginLinkText: { fontFamily: fontFamily.regular, fontSize: 15 },
  error: { marginTop: 6, fontFamily: fontFamily.semibold, fontSize: 13 },
});
