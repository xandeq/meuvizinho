"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { profileApi } from "@/lib/api";
import { updateProfileSchema } from "@bairronow/shared-validators";
import type { ProfileDto } from "@bairronow/shared-types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
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
    setSaving(true);
    try {
      const updated = await profileApi.updateMe(parsed.data);
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-fg/70 font-medium">Carregando perfil...</p>;
  }

  if (!profile) {
    return (
      <p className="text-danger font-semibold">
        {error ?? "Nao foi possivel carregar o perfil."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar
            name={profile.displayName ?? profile.bairroNome ?? "?"}
            verified={profile.isVerified}
            size="xl"
          />
          <div>
            <h1 className="text-3xl font-extrabold text-fg leading-tight">
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
        <Link
          href="/profile/settings/"
          className="text-sm text-primary font-semibold hover:underline mt-1"
        >
          Configurações
        </Link>
      </header>

      <Card padding="md">
        {!editing ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase font-bold text-fg/60">Bio</p>
              <p className="font-medium text-fg">
                {profile.bio ?? "(sem bio)"}
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                Editar perfil
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <FormField
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
                onClick={() => {
                  setEditing(false);
                  setDisplayName(profile.displayName ?? "");
                  setBio(profile.bio ?? "");
                  setError(null);
                }}
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
