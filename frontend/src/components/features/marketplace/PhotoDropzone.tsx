"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

// D-01: 1-6 photos, first = cover automatically. Reorder with up/down arrows.

export interface PhotoDropzoneProps {
  value: File[];
  onChange: (files: File[]) => void;
  max?: number;
  error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function PhotoDropzone({
  value,
  onChange,
  max = 6,
  error,
}: PhotoDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const filtered = accepted.filter((f) => f.size <= MAX_FILE_SIZE);
      const combined = [...value, ...filtered].slice(0, max);
      onChange(combined);
    },
    [value, onChange, max]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-fg">
        Fotos ({value.length}/{max})
      </label>

      {value.length < max && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/60"
          }`}
        >
          <input {...getInputProps()} aria-label="Upload de fotos" />
          <p className="text-sm font-semibold text-fg/70">
            {isDragActive
              ? "Solte as imagens aqui"
              : "Arraste fotos ou clique para escolher"}
          </p>
          <p className="text-xs text-fg/50 mt-1">
            JPG/PNG, máx 5MB cada, até {max} fotos
          </p>
        </div>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-border/50 bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-white text-xs font-extrabold px-2 py-0.5 rounded">
                  Capa
                </span>
              )}
              <div className="absolute bottom-1 right-1 flex gap-1">
                <button
                  type="button"
                  aria-label="Mover para cima"
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  className="bg-black/60 text-white rounded px-1 text-xs disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Mover para baixo"
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === value.length - 1}
                  className="bg-black/60 text-white rounded px-1 text-xs disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => remove(idx)}
                  className="bg-danger text-white rounded px-1 text-xs font-bold"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-danger font-semibold">{error}</p>
      )}
    </div>
  );
}
