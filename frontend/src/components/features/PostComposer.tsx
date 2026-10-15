"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import {
  createPostSchema,
  type CreatePostInput,
} from "@bairronow/shared-validators";
import { feedClient } from "@/lib/feed";
import { useFeedStore } from "@/stores/feed-store";
import { useAuthStore } from "@/lib/auth";
import Button from "@/components/ui/Button";

interface PostComposerProps {
  open: boolean;
  onClose: () => void;
}

const MAX_IMAGES = 4;

const CATEGORIES = ["Geral", "Dica", "Alerta", "Pergunta", "Evento"] as const;

const CATEGORY_STYLE: Record<string, { active: string; idle: string }> = {
  Geral:    { active: "bg-muted-fg text-white border-muted-fg",                       idle: "bg-muted text-muted-fg border-border/50 hover:border-muted-fg/40 hover:text-fg" },
  Dica:     { active: "bg-secondary text-white border-secondary",                     idle: "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20" },
  Alerta:   { active: "bg-danger text-white border-danger",                           idle: "bg-danger-light text-danger border-danger/20 hover:bg-danger/15" },
  Pergunta: { active: "bg-primary text-white border-primary shadow-sm",               idle: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" },
  Evento:   { active: "bg-accent text-white border-accent",                           idle: "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20" },
};

function XIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export default function PostComposer({ open, onClose }: PostComposerProps) {
  const user = useAuthStore((s) => s.user);
  const isVerified = user?.isVerified === true;
  const prependNew = useFeedStore((s) => s.prependNew);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { category: "Geral", body: "" },
  });

  const body = watch("body") ?? "";
  const selectedCategory = watch("category");

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const slots = MAX_IMAGES - files.length;
      const toAdd = accepted.slice(0, slots);
      if (toAdd.length === 0) return;
      setCompressing(true);
      try {
        const compressed = await Promise.all(
          toAdd.map((f) =>
            imageCompression(f, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1600,
              useWebWorker: true,
            })
          )
        );
        setFiles((prev) => [...prev, ...compressed]);
        setPreviews((prev) => [
          ...prev,
          ...compressed.map((f) => URL.createObjectURL(f)),
        ]);
      } finally {
        setCompressing(false);
      }
    },
    [files.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    multiple: true,
    disabled: files.length >= MAX_IMAGES,
  });

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = async (data: CreatePostInput) => {
    if (!isVerified) {
      setServerError("Você precisa estar verificado para postar.");
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const formData = new FormData();
      formData.append("category", data.category);
      formData.append("body", data.body);
      for (const f of files) formData.append("images", f, f.name);
      const post = await feedClient.createPost(formData);
      prependNew(post);
      reset();
      setFiles([]);
      setPreviews([]);
      onClose();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setFiles([]);
    setPreviews([]);
    setServerError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-2xl bg-card rounded-3xl border border-border/50 shadow-xl max-h-[90dvh] overflow-y-auto animate-fade-up">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-fg">Novo post</h2>
            <p className="text-xs text-muted-fg">Compartilhe com o seu bairro</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-fg hover:text-fg hover:bg-muted transition-all duration-200"
            aria-label="Fechar"
          >
            <XIcon />
          </button>
        </div>

        {/* Not verified warning */}
        {!isVerified && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-accent-light border border-accent/20 text-sm font-semibold text-accent">
            Você precisa estar verificado para postar no bairro.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-muted-fg uppercase tracking-widest mb-2">
              Categoria
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setValue("category", cat)}
                  className={[
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200",
                    selectedCategory === cat
                      ? CATEGORY_STYLE[cat]?.active ?? "bg-primary text-white border-primary"
                      : CATEGORY_STYLE[cat]?.idle ?? "bg-muted text-muted-fg border-border/50 hover:text-fg",
                  ].join(" ")}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input type="hidden" {...register("category")} />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="postcomposer-mensagem" className="block text-xs font-bold text-muted-fg uppercase tracking-widest mb-2">
              Mensagem
            </label>
            <textarea
              id="postcomposer-mensagem"
              {...register("body")}
              rows={5}
              maxLength={2000}
              className={[
                "w-full px-4 py-3 rounded-xl bg-muted text-fg text-sm",
                "border outline-none transition-all duration-200 resize-none",
                "placeholder:text-muted-fg/60",
                "focus:bg-card focus:border-primary",
                errors.body
                  ? "border-danger bg-danger-light"
                  : "border-border/50",
              ].join(" ")}
              placeholder="O que está acontecendo no seu bairro?"
            />
            <div className="flex justify-between items-center text-xs mt-1.5 px-1">
              {errors.body ? (
                <span className="text-danger font-semibold">{errors.body.message}</span>
              ) : (
                <span />
              )}
              <span className={body.length > 1800 ? "text-danger font-semibold" : "text-muted-fg"}>
                {body.length}/2000
              </span>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-xs font-bold text-muted-fg uppercase tracking-widest mb-2">
              Imagens <span className="normal-case font-medium">(até {MAX_IMAGES})</span>
            </label>

            {previews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-20 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      aria-label="Remover imagem"
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length < MAX_IMAGES && (
              <div
                {...getRootProps()}
                className={[
                  "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center",
                  "transition-all duration-200",
                  isDragActive
                    ? "border-primary bg-primary-light"
                    : "border-border/50 hover:border-border-strong hover:bg-muted",
                ].join(" ")}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2 text-muted-fg">
                  <ImageIcon />
                  <p className="text-sm font-semibold">
                    {compressing
                      ? "Processando…"
                      : isDragActive
                        ? "Solte aqui"
                        : "Arraste ou clique para adicionar"}
                  </p>
                  <p className="text-xs opacity-60">JPG, PNG, WebP &bull; máx. 1 MB cada</p>
                </div>
              </div>
            )}
          </div>

          {serverError && (
            <p className="text-sm font-semibold text-danger bg-danger-light p-3 rounded-xl">
              {serverError}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pb-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              disabled={!isVerified || compressing}
            >
              Publicar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
