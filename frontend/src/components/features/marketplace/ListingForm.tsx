"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  listingSchema,
  listingEditSchema,
  type ListingFormValues,
} from "@/lib/validators/listing";
import CategoryPicker from "./CategoryPicker";
import PhotoDropzone from "./PhotoDropzone";

// D-01, D-02, D-03: photo dropzone, numeric required price, 2-step category picker.

export interface ListingFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<ListingFormValues>;
  onSubmit: (values: ListingFormValues) => Promise<void>;
  submitLabel?: string;
}

export default function ListingForm({
  mode,
  defaultValues,
  onSubmit,
  submitLabel,
}: ListingFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ListingFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver((mode === "edit" ? listingEditSchema : listingSchema) as any) as any,
    defaultValues: {
      title: "",
      description: "",
      price: undefined as unknown as number,
      categoryCode: undefined as unknown as string,
      subcategoryCode: "",
      photos: [],
      ...defaultValues,
    },
  });

  const description = watch("description") ?? "";

  const submit = async (values: ListingFormValues) => {
    setSubmitting(true);
    setApiError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="space-y-5 bg-card border border-border/50 shadow-sm rounded-2xl p-5"
      noValidate
    >
      <div>
        <label className="block text-sm font-bold text-fg mb-1">
          Título
        </label>
        <input
          type="text"
          {...register("title")}
          className="w-full border border-border/50 rounded-xl px-3 py-2 font-medium bg-muted text-fg focus:border-primary focus:bg-card focus:outline-none transition-colors"
          placeholder="Ex: Bicicleta aro 26 seminova"
        />
        {errors.title && (
          <p className="text-sm text-danger font-semibold mt-1">
            {errors.title.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-fg mb-1">
          Descrição{" "}
          <span className="text-xs text-muted-fg font-medium">
            ({description.length}/500)
          </span>
        </label>
        <textarea
          {...register("description")}
          rows={4}
          className="w-full border border-border/50 rounded-xl px-3 py-2 font-medium bg-muted text-fg focus:border-primary focus:bg-card focus:outline-none transition-colors"
          placeholder="Conte sobre o produto, estado, motivo da venda..."
        />
        {errors.description && (
          <p className="text-sm text-danger font-semibold mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-fg mb-1">
          Preço (R$)
        </label>
        <p className="text-xs text-muted-fg mb-1.5">Para doar, deixe 0.</p>
        <input
          type="number"
          step="0.01"
          {...register("price", { valueAsNumber: true })}
          className="w-full border border-border/50 rounded-xl px-3 py-2 font-medium bg-muted text-fg focus:border-primary focus:bg-card focus:outline-none transition-colors"
          placeholder="450"
        />
        {errors.price && (
          <p className="text-sm text-danger font-semibold mt-1">
            {errors.price.message}
          </p>
        )}
      </div>

      <Controller
        name="categoryCode"
        control={control}
        render={({ field: categoryField }) => (
          <Controller
            name="subcategoryCode"
            control={control}
            render={({ field: subField }) => (
              <CategoryPicker
                categoryCode={categoryField.value}
                subcategoryCode={subField.value}
                onChange={(cat, sub) => {
                  categoryField.onChange(cat);
                  subField.onChange(sub ?? "");
                }}
                error={
                  errors.categoryCode?.message ??
                  errors.subcategoryCode?.message
                }
              />
            )}
          />
        )}
      />

      <Controller
        name="photos"
        control={control}
        render={({ field }) => (
          <PhotoDropzone
            value={field.value ?? []}
            onChange={field.onChange}
            error={errors.photos?.message as string | undefined}
          />
        )}
      />

      {apiError && (
        <p className="text-sm text-danger font-semibold">{apiError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary text-white font-extrabold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting
          ? "Enviando..."
          : submitLabel ?? (mode === "create" ? "Publicar anúncio" : "Salvar alterações")}
      </button>
    </form>
  );
}
