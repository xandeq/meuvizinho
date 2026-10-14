import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../src/components/Button';
import { PhotoPicker } from '../../src/components/marketplace/PhotoPicker';
import { CategoryPicker } from '../../src/components/marketplace/CategoryPicker';
import { marketplaceApi } from '../../src/lib/api/marketplace';
import { createListingSchema, type CreateListingInput } from '../../src/lib/validators/listing';
import { useAuthStore } from '../../src/lib/auth-store';
import { useTheme } from '../../src/theme/ThemeContext';
import { fontFamily, radius } from '../../src/theme/tokens';
import type { CategoryDto, ListingPhotoAsset } from '../../src/lib/api/marketplace.types';

export default function CreateListingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const isVerified = useAuthStore((s) => !!s.user?.isVerified);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photos, setPhotos] = useState<ListingPhotoAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      categoryCode: '',
      subcategoryCode: '',
      photos: [],
    },
  });

  useEffect(() => {
    setValue('photos', photos, { shouldValidate: true });
  }, [photos]);

  useEffect(() => {
    marketplaceApi.listCategories().then(setCategories).catch(() => {});
  }, []);

  const onSubmit = async (data: CreateListingInput) => {
    setSubmitting(true);
    try {
      const created = await marketplaceApi.create(
        {
          title: data.title,
          description: data.description,
          price: data.price,
          categoryCode: data.categoryCode,
          subcategoryCode: data.subcategoryCode,
        },
        data.photos
      );
      Alert.alert('Publicado', 'Seu anúncio está no ar!');
      router.replace({ pathname: '/marketplace/[id]', params: { id: created.id } });
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.error || 'Não foi possível publicar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isVerified) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.warnTitle, { color: colors.fg }]}>Verificação necessária</Text>
        <Text style={[styles.warnText, { color: colors.mutedFg }]}>
          Você precisa estar verificado para criar anúncios no marketplace.
        </Text>
      </View>
    );
  }

  const categoryCode = watch('categoryCode');
  const subcategoryCode = watch('subcategoryCode');
  const selectedCat = categories.find((c) => c.code === categoryCode);
  const selectedSub = selectedCat?.subcategories.find((s) => s.code === subcategoryCode);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text style={[styles.label, { color: colors.fg }]}>Título</Text>
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.fg, backgroundColor: colors.card }]}
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Ex: Sofá 3 lugares cinza"
            placeholderTextColor={colors.mutedFg}
          />
        )}
      />
      {errors.title && <Text style={[styles.error, { color: colors.danger }]}>{errors.title.message}</Text>}

      <Text style={[styles.label, { color: colors.fg }]}>Descrição</Text>
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextInput
            style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.fg, backgroundColor: colors.card }]}
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Detalhes, estado, medidas…"
            placeholderTextColor={colors.mutedFg}
            multiline
            maxLength={500}
          />
        )}
      />
      {errors.description && <Text style={[styles.error, { color: colors.danger }]}>{errors.description.message}</Text>}

      <Text style={[styles.label, { color: colors.fg }]}>Preço (R$)</Text>
      <Controller
        control={control}
        name="price"
        render={({ field }) => (
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.fg, backgroundColor: colors.card }]}
            keyboardType="numeric"
            value={field.value ? String(field.value) : ''}
            onChangeText={(t) => field.onChange(Number(t.replace(/[^0-9.]/g, '')))}
            placeholder="Ex: 450"
            placeholderTextColor={colors.mutedFg}
          />
        )}
      />
      {errors.price && <Text style={[styles.error, { color: colors.danger }]}>{errors.price.message}</Text>}

      <Text style={[styles.label, { color: colors.fg }]}>Categoria</Text>
      <Pressable accessibilityRole="button" style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setPickerOpen(true)}>
        <Text style={{ color: selectedCat ? colors.fg : colors.mutedFg }}>
          {selectedCat && selectedSub
            ? `${selectedCat.displayName} → ${selectedSub.displayName}`
            : 'Escolher categoria'}
        </Text>
      </Pressable>
      {errors.categoryCode && <Text style={[styles.error, { color: colors.danger }]}>{errors.categoryCode.message}</Text>}

      <View style={{ height: 16 }} />
      <PhotoPicker photos={photos} onChange={setPhotos} />
      {errors.photos && (
        <Text style={[styles.error, { color: colors.danger }]}>{(errors.photos as any).message || 'Fotos inválidas'}</Text>
      )}

      <View style={{ height: 20 }} />
      <Button
        title={submitting ? 'Publicando…' : 'Publicar anúncio'}
        icon="checkmark-circle"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
      />

      <CategoryPicker
        visible={pickerOpen}
        categories={categories}
        onSelect={(cat, sub) => {
          setValue('categoryCode', cat, { shouldValidate: true });
          setValue('subcategoryCode', sub, { shouldValidate: true });
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontFamily: fontFamily.bold, fontSize: 14, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  error: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 4 },
  warnTitle: { fontFamily: fontFamily.extrabold, fontSize: 18, margin: 16 },
  warnText: { fontFamily: fontFamily.regular, marginHorizontal: 16 },
});
