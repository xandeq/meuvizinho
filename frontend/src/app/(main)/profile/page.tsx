"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import EmptyState from "@/components/ui/EmptyState";
import BusinessRating from "@/components/features/BusinessRating";
import { profileApi } from "@/lib/api";
import { updateProfileSchema } from "@bairronow/shared-validators";
import { useAuthStore } from "@/lib/auth";
import type { ProfileDto } from "@bairronow/shared-types";

interface BusinessPhoto {
  id: number;
  url: string;
  displayOrder: number;
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BusinessGalleryUpload({ userId }: { userId: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bairronow.com.br";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchPhotos = () => {
    setLoadingPhotos(true);
    fetch(`${API}/api/v1/users/${userId}/business-photos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar fotos");
        return r.json();
      })
      .then((d: BusinessPhoto[]) => setPhotos(d))
      .catch(() => setPhotos([]))
      .finally(() => setLoadingPhotos(false));
  };

  useEffect(() => {
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`${API}/api/v1/users/${userId}/business-photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error("Falha ao enviar foto");
      fetchPhotos();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar foto");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (photoId: number) => {
    setDeletingId(photoId);
    try {
      const res = await fetch(`${API}/api/v1/users/${userId}/business-photos/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao remover foto");
      fetchPhotos();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao remover foto");
    } finally {
      setDeletingId(null);
    }
  };

  const atMax = photos.length >= 10;

  return (
    <div className="space-y-3 pt-4 border-t border-border/60">
      <h3 className="text-sm font-semibold text-fg">Fotos do negócio</h3>

      {loadingPhotos ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-16 h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative w-16 h-16">
              <Image
                src={photo.url}
                alt="Foto do negócio"
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <button
                type="button"
                disabled={deletingId === photo.id}
                onClick={() => handleDelete(photo.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center shadow hover:bg-danger/90 disabled:opacity-50 transition-opacity"
                title="Remover foto"
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <p className="text-sm text-danger font-semibold">{uploadError}</p>
      )}

      {atMax ? (
        <p className="text-xs text-muted-fg">Máximo 10 fotos</p>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            id="business-photo-upload"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label
            htmlFor="business-photo-upload"
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-fg cursor-pointer hover:border-primary hover:text-primary transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                </svg>
                Enviando...
              </>
            ) : (
              <>
                <UploadIcon />
                Adicionar foto
              </>
            )}
          </label>
        </>
      )}
    </div>
  );
}

function StoreIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 13.5 19.79 19.79 0 0 1 1.07 4.84 2 2 0 0 1 3.04 2.66h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export default function ProfilePage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    profileApi
      .getMe()
      .then((p) => {
        if (!mounted) return;
        setProfile(p);
        setDisplayName(p.displayName ?? "");
        setBio(p.bio ?? "");
        setIsBusinessAccount(p.isBusinessAccount ?? false);
        setBusinessName(p.businessName ?? "");
        setBusinessCategory(p.businessCategory ?? "");
        setBusinessDescription(p.businessDescription ?? "");
        setBusinessPhone(p.businessPhone ?? "");
        setBusinessWebsite(p.businessWebsite ?? "");
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar perfil");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setError(null);
    const parsed = updateProfileSchema.safeParse({ displayName, bio });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados invalidos");
      return;
    }
    if (isBusinessAccount && !businessName.trim()) {
      setError("Nome do negocio e obrigatorio");
      return;
    }
    setSaving(true);
    try {
      const updated = await profileApi.updateMe({
        ...parsed.data,
        isBusinessAccount,
        businessName: isBusinessAccount ? businessName : undefined,
        businessCategory: isBusinessAccount ? businessCategory : undefined,
        businessDescription: isBusinessAccount ? businessDescription : undefined,
        businessPhone: isBusinessAccount ? businessPhone : undefined,
        businessWebsite: isBusinessAccount ? businessWebsite : undefined,
      });
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setEditing(false);
    setDisplayName(profile.displayName ?? "");
    setBio(profile.bio ?? "");
    setIsBusinessAccount(profile.isBusinessAccount ?? false);
    setBusinessName(profile.businessName ?? "");
    setBusinessCategory(profile.businessCategory ?? "");
    setBusinessDescription(profile.businessDescription ?? "");
    setBusinessPhone(profile.businessPhone ?? "");
    setBusinessWebsite(profile.businessWebsite ?? "");
    setError(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-5 bg-muted rounded w-40" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
          </div>
          <div className="h-9 bg-muted rounded-xl w-24" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/50 p-4 space-y-2 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        title="Erro ao carregar perfil"
        description={error ?? "Não foi possível carregar o perfil."}
      />
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Profile header card */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Cover gradient */}
        <div className="h-20 bg-gradient-to-r from-primary/20 via-secondary/15 to-primary/10" />
        {/* Avatar + info row */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-8 mb-3">
            <div className="ring-4 ring-card rounded-full shadow-md">
              <Avatar
                name={profile.displayName ?? profile.bairroNome ?? "?"}
                verified={profile.isVerified}
                size="xl"
              />
            </div>
            <Link
              href="/profile/settings/"
              className="mb-1 text-xs font-semibold text-muted-fg border border-border/50 bg-card px-3 py-1.5 rounded-xl hover:text-primary hover:border-primary/30 transition-all duration-200"
            >
              Configurações
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold text-fg leading-tight">
            {profile.displayName ?? "(sem nome)"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-fg font-medium">
              {profile.bairroNome ?? "Bairro não definido"}
            </span>
            <VerifiedBadge verified={profile.isVerified} />
          </div>
        </div>
      </div>

      <Card padding="md">
        {!editing ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase font-bold text-fg/60">Bio</p>
              <p className="font-medium text-fg">
                {profile.bio ?? "(sem bio)"}
              </p>
            </div>

            {profile.isBusinessAccount && (
              <div className="pt-2 space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-accent/15 text-accent">
                  <StoreIcon />
                  Negocio local
                </span>
                {profile.businessName && (
                  <p className="font-semibold text-fg text-base">{profile.businessName}</p>
                )}
                <div className="space-y-1.5">
                  {profile.businessCategory && (
                    <div className="flex items-center gap-2 text-sm text-muted-fg">
                      <StoreIcon />
                      <span>{profile.businessCategory}</span>
                    </div>
                  )}
                  {profile.businessPhone && (
                    <div className="flex items-center gap-2 text-sm text-muted-fg">
                      <PhoneIcon />
                      <span>{profile.businessPhone}</span>
                    </div>
                  )}
                  {profile.businessWebsite && (
                    <div className="flex items-center gap-2 text-sm text-muted-fg">
                      <GlobeIcon />
                      <a
                        href={profile.businessWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {profile.businessWebsite}
                      </a>
                    </div>
                  )}
                </div>
                {/* Business ratings — own profile: canRate=false */}
                {userId && (
                  <div className="mt-6 pt-5 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-fg mb-3">Avaliações</h3>
                    <BusinessRating businessUserId={userId} canRate={false} />
                  </div>
                )}
                {/* Business photo gallery upload */}
                {userId && (
                  <BusinessGalleryUpload userId={userId} />
                )}
              </div>
            )}

            <div className="pt-2 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                Editar perfil
              </Button>
              {profile.isBusinessAccount && (
                <Link
                  href="/profile/analytics/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  Analytics
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <FormField
              id="displayName"
              name="displayName"
              label="Nome de exibicao"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
            />
            <div>
              <label className="block text-sm font-semibold text-fg mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none transition-colors duration-150 focus:bg-card focus:border-primary font-medium resize-none"
              />
              <p className="text-xs text-fg/60 mt-1">{bio.length}/160</p>
            </div>

            <div className="border-t border-border/60 pt-4 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isBusinessAccount}
                    onChange={(e) => setIsBusinessAccount(e.target.checked)}
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                      isBusinessAccount ? "bg-primary" : "bg-muted"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      isBusinessAccount ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fg">Conta Negocio</p>
                  <p className="text-xs text-muted-fg">Exibe seu negocio no mapa do bairro</p>
                </div>
              </label>

              {isBusinessAccount && (
                <div className="space-y-4 pl-1">
                  <FormField
                    id="businessName"
                    name="businessName"
                    label="Nome do negocio"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    maxLength={120}
                    required
                    placeholder="Ex: Padaria Boa Vista"
                  />
                  <FormField
                    id="businessCategory"
                    name="businessCategory"
                    label="Categoria"
                    type="text"
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    maxLength={80}
                    placeholder="Ex: Alimentacao, Servicos, Comercio"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-fg mb-1">
                      Descricao
                    </label>
                    <textarea
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      maxLength={300}
                      rows={3}
                      placeholder="Conte um pouco sobre seu negocio..."
                      className="w-full px-4 py-2.5 rounded-lg bg-muted text-fg placeholder:text-muted-fg border-2 border-transparent outline-none transition-colors duration-150 focus:bg-card focus:border-primary font-medium resize-none"
                    />
                    <p className="text-xs text-fg/60 mt-1">{businessDescription.length}/300</p>
                  </div>
                  <FormField
                    id="businessPhone"
                    name="businessPhone"
                    label="Telefone"
                    type="tel"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    maxLength={20}
                    placeholder="Ex: (27) 99999-0000"
                  />
                  <FormField
                    id="businessWebsite"
                    name="businessWebsite"
                    label="Website"
                    type="url"
                    value={businessWebsite}
                    onChange={(e) => setBusinessWebsite(e.target.value)}
                    maxLength={200}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-danger font-semibold">{error}</p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleSave}
                loading={saving}
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
