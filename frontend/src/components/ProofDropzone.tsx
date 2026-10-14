"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import imageCompression from "browser-image-compression";

interface ProofDropzoneProps {
  onFile: (file: File) => void;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

export default function ProofDropzone({ onFile }: ProofDropzoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[], rejected: FileRejection[]) => {
      setError(null);
      if (rejected.length > 0) {
        const code = rejected[0].errors[0]?.code;
        if (code === "file-too-large") setError("Arquivo muito grande. Maximo 5MB.");
        else if (code === "file-invalid-type") setError("Formato inválido. Use JPG, PNG, WEBP ou PDF.");
        else setError("Arquivo inválido.");
        return;
      }
      const raw = accepted[0];
      if (!raw) return;

      setBusy(true);
      try {
        let final = raw;
        if (raw.type.startsWith("image/")) {
          final = await imageCompression(raw, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
          });
        }
        setFileName(final.name);
        if (final.type.startsWith("image/")) {
          setPreview(URL.createObjectURL(final));
        } else {
          setPreview(null);
        }
        onFile(final);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao processar arquivo");
      } finally {
        setBusy(false);
      }
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={[
          "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-muted"
            : "border-border bg-bg hover:border-primary hover:bg-muted",
        ].join(" ")}
      >
        <input {...getInputProps()} />
        <p className="font-bold text-fg">
          {busy
            ? "Processando..."
            : "Arraste o comprovante aqui ou clique para selecionar"}
        </p>
        <p className="text-sm text-fg/60 mt-2 font-medium">
          JPG, PNG, WEBP ou PDF — max. 5MB
        </p>
      </div>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      {fileName && (
        <div className="rounded-md bg-muted p-3">
          <p className="font-bold text-fg text-sm">{fileName}</p>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Pre-visualizacao"
              className="mt-2 max-h-48 rounded-xl border border-border/50"
            />
          )}
        </div>
      )}
    </div>
  );
}
