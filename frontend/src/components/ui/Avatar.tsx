"use client";
import { HTMLAttributes, useState } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  verified?: boolean;
  online?: boolean;
}

const sizeMap: Record<
  AvatarSize,
  { wrap: string; img: string; badge: string; text: string; ring: string }
> = {
  xs: {
    wrap:  "w-7 h-7",
    img:   "w-7 h-7",
    badge: "w-3.5 h-3.5 -bottom-0.5 -right-0.5 border",
    text:  "text-[9px] font-bold",
    ring:  "ring-1",
  },
  sm: {
    wrap:  "w-9 h-9",
    img:   "w-9 h-9",
    badge: "w-4 h-4 -bottom-0.5 -right-0.5 border",
    text:  "text-[11px] font-bold",
    ring:  "ring-1",
  },
  md: {
    wrap:  "w-11 h-11",
    img:   "w-11 h-11",
    badge: "w-5 h-5 -bottom-0.5 -right-0.5 border-2",
    text:  "text-xs font-bold",
    ring:  "ring-2",
  },
  lg: {
    wrap:  "w-14 h-14",
    img:   "w-14 h-14",
    badge: "w-5 h-5 -bottom-1 -right-1 border-2",
    text:  "text-sm font-bold",
    ring:  "ring-2",
  },
  xl: {
    wrap:  "w-20 h-20",
    img:   "w-20 h-20",
    badge: "w-6 h-6 -bottom-1 -right-1 border-2",
    text:  "text-lg font-bold",
    ring:  "ring-2",
  },
};

const colorPalette = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-pink-600",
];

function pickColor(name: string | null | undefined): string {
  if (!name) return colorPalette[0];
  const idx = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colorPalette.length;
  return colorPalette[idx];
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 10 10" fill="none" className="w-[60%] h-[60%]">
      <path
        d="M2 5.2L4 7.2L8 3"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Avatar({
  src,
  name,
  size = "md",
  verified = false,
  online = false,
  className = "",
  ...rest
}: AvatarProps) {
  const s = sizeMap[size];
  const [imgFailed, setImgFailed] = useState(false);

  const showInitials = !src || imgFailed;

  return (
    <div
      className={["relative inline-flex shrink-0", s.wrap, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {showInitials ? (
        <span
          className={[
            "rounded-full flex items-center justify-center",
            "text-white select-none",
            pickColor(name),
            s.img,
            s.text,
          ].join(" ")}
          aria-label={name ?? "Vizinho"}
        >
          {initials(name)}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name ?? "Vizinho"}
          className={["rounded-full object-cover", s.img].join(" ")}
          onError={() => setImgFailed(true)}
        />
      )}

      {verified && (
        <span
          aria-label="Vizinho verificado"
          className={[
            "absolute rounded-full bg-secondary border-card",
            "flex items-center justify-center",
            "animate-badge-pop",
            s.badge,
          ].join(" ")}
        >
          <CheckIcon />
        </span>
      )}

      {online && !verified && (
        <span
          aria-label="Online"
          className={[
            "absolute rounded-full bg-emerald-400 border-2 border-card",
            "w-3 h-3 -bottom-0.5 -right-0.5",
          ].join(" ")}
        />
      )}
    </div>
  );
}
