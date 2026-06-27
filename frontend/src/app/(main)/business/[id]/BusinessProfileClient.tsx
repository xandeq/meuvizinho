"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/lib/auth";
import BusinessRating from "@/components/features/BusinessRating";
import type { ConversationDto } from "@/lib/types/marketplace";

interface BusinessPhoto {
  id: number;
  url: string;
  displayOrder: number;
}

function CameraIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function BusinessGallery({ userId }: { userId: string }) {
  const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bairronow.com.br";
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/v1/users/${userId}/business-photos`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d: BusinessPhoto[]) => setPhotos(d))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, [userId, API]);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-fg uppercase tracking-wide">
          <CameraIcon />
          <span>Galeria</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square rounded-xl animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-fg uppercase tracking-wide">
        <CameraIcon />
        <span>Galeria</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="overflow-hidden rounded-xl aspect-square relative">
            <Image
              src={photo.url}
              alt="Foto do negócio"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 200px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PublicProfile {
  userId: string;
  displayName: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  isBusinessAccount: boolean;
  businessName: string | null;
  businessCategory: string | null;
  businessDescription: string | null;
  businessPhone: string | null;
  businessWebsite: string | null;
  bairroNome: string | null;
  ratingAverage: number | null;
  ratingTotal: number;
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.58a16 16 0 0 0 5.51 5.51l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full animate-shimmer shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 rounded-full animate-shimmer" />
            <div className="h-4 w-32 rounded-full animate-shimmer" />
            <div className="h-4 w-24 rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AvatarCircle({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="w-16 h-16 rounded-full object-cover ring-2 ring-border/50 shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shrink-0">
      {initials || "?"}
    </div>
  );
}

function StarDisplay({ average, total }: { average: number | null; total: number }) {
  if (average === null || total === 0) {
    return (
      <span className="text-muted-fg text-sm">Sem avaliações ainda</span>
    );
  }

  const rounded = Math.round(average);
  const stars = [1, 2, 3, 4, 5].map((n) => (
    <span key={n} className={n <= rounded ? "text-accent" : "text-border"}>★</span>
  ));

  return (
    <span className="flex items-center gap-1 text-sm">
      <span className="flex">{stars}</span>
      <span className="text-fg font-semibold ml-1">{average.toFixed(1)}</span>
      <span className="text-muted-fg">({total} avaliação{total !== 1 ? "ões" : ""})</span>
    </span>
  );
}

interface Props {
  userId: string;
}

export default function BusinessProfileClient({ userId }: Props) {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bairronow.com.br";

  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sendingDm, setSendingDm] = useState(false);

  const handleMessage = async () => {
    if (!token) { router.push("/login"); return; }
    setSendingDm(true);
    try {
      const res = await fetch(`${API}/api/v1/users/${userId}/conversation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      const conv: ConversationDto = await res.json();
      router.push(`/chat/${conv.id}/`);
    } catch {
      // best-effort — stay on page
    } finally {
      setSendingDm(false);
    }
  };

  // Record view (fire and forget, anonymous)
  useEffect(() => {
    fetch(`${API}/api/v1/users/${userId}/analytics/view`, { method: "POST" }).catch(() => {});
  }, [userId, API]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/v1/users/${userId}/public`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d: PublicProfile) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [userId, token, API]);

  if (loading) return <ProfileSkeleton />;

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center space-y-4">
        <p className="text-lg font-semibold text-fg">Negócio não encontrado</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-primary hover:underline"
        >
          ← Voltar
        </button>
      </div>
    );
  }

  const displayTitle = data.businessName || data.displayName || "Negócio";
  const hasContact = data.businessPhone || data.businessWebsite || data.businessDescription;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-fg hover:text-fg transition-colors"
      >
        <span>←</span>
        <span>Voltar</span>
      </button>

      {/* Header card */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-4">
          <AvatarCircle photoUrl={data.photoUrl} name={displayTitle} />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-fg leading-tight">{displayTitle}</h1>
              {data.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mt-1 shrink-0">
                  <CheckIcon />
                  Verificado
                </span>
              )}
            </div>

            {data.businessCategory && (
              <span className="inline-block bg-accent/15 text-accent rounded-full px-3 py-0.5 text-sm font-medium">
                {data.businessCategory}
              </span>
            )}

            {data.bairroNome && (
              <div className="flex items-center gap-1 text-muted-fg text-sm">
                <MapPinIcon />
                <span>{data.bairroNome}</span>
              </div>
            )}

            <StarDisplay average={data.ratingAverage} total={data.ratingTotal} />

            {currentUserId !== userId && (
              <button
                type="button"
                onClick={handleMessage}
                disabled={sendingDm}
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {sendingDm ? "Abrindo..." : "Mensagem"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contact / Description card */}
      {hasContact && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-fg uppercase tracking-wide">Informações</h2>

          {data.businessDescription && (
            <p className="text-muted-fg text-sm leading-relaxed">{data.businessDescription}</p>
          )}

          {data.businessPhone && (
            <div className="flex items-center gap-2">
              <span className="text-muted-fg">
                <PhoneIcon />
              </span>
              <span className="text-fg font-medium text-sm">{data.businessPhone}</span>
            </div>
          )}

          {data.businessWebsite && (
            <div className="flex items-center gap-2">
              <span className="text-muted-fg">
                <GlobeIcon />
              </span>
              <a
                href={data.businessWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline truncate"
              >
                {data.businessWebsite}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Ratings section */}
      {data.isBusinessAccount && (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
          <h2 className="text-sm font-bold text-fg uppercase tracking-wide mb-4">Avaliações</h2>
          <BusinessRating businessUserId={userId} canRate={true} />
        </div>
      )}

      {/* Photo gallery section */}
      <BusinessGallery userId={userId} />
    </div>
  );
}
