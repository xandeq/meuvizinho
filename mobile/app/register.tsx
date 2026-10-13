import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { registerSchema, type RegisterInput } from '@bairronow/shared-validators';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { authApi } from '../src/lib/api';
import { useAuthStore } from '../src/lib/auth-store';
import { useTheme } from '../src/theme/ThemeContext';
import { fontFamily, radius } from '../src/theme/tokens';

export default function Register() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { email: '', password: '', confirmPassword: '', acceptedPrivacyPolicy: false as any },
  });

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
        <Input label="Senha" value={value} onChangeText={onChange} secureTextEntry placeholder="********" error={errors.password?.message} />
      )} />
      <Controller control={control} name="confirmPassword" render={({ field: { onChange, value } }) => (
        <Input label="Confirme a senha" value={value} onChangeText={onChange} secureTextEntry placeholder="********" error={errors.confirmPassword?.message} />
      )} />
      <Controller control={control} name="acceptedPrivacyPolicy" render={({ field: { onChange, value } }) => (
        <>
          <Pressable style={styles.checkboxRow} onPress={() => onChange(!value)}>
            <View style={[
              styles.checkbox,
              { borderRadius: radius.xs, borderColor: colors.primary },
              value && { backgroundColor: colors.primary },
            ]} />
            <Text style={[styles.checkboxText, { color: colors.fg }]}>Aceito a política de privacidade</Text>
          </Pressable>
          {errors.acceptedPrivacyPolicy ? <Text style={[styles.error, { color: colors.danger }]}>{errors.acceptedPrivacyPolicy.message}</Text> : null}
        </>
      )} />
      <View style={{ height: 16 }} />
      <Button title="Criar conta" icon="person-add" onPress={handleSubmit(onSubmit)} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 28 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  checkbox: { width: 22, height: 22, borderWidth: 2, marginRight: 12 },
  checkboxText: { fontFamily: fontFamily.regular, fontSize: 14 },
  error: { marginTop: 6, fontFamily: fontFamily.semibold, fontSize: 13 },
});
