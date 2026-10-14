import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

// Outfit servida do próprio repo (WOFF2 em ./fonts, licença OFL). Com
// next/font/google o build baixava a fonte do Google na hora e falhava de
// vez em quando no CI ("next/font/google queries have exactly one entry").
const outfit = localFont({
  src: [
    { path: "./fonts/Outfit-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Outfit-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Outfit-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Outfit-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Outfit-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-outfit",
  display: "swap",
});

// API_URL known at build time for the static export — we can preconnect to it
// in <head> so the browser warms the TCP + TLS handshake before the first XHR.
// Saves ~100–300ms on the first authenticated API call in real-world Brazilian
// mobile networks (high RTT to SmarterASP via Cloudflare).
const apiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
      : null;
  } catch {
    return null;
  }
})();

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://meuvizinhoapp.com.br";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Meu Vizinho",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512x512.png`,
    },
    {
      "@type": "MobileApplication",
      name: "Meu Vizinho",
      operatingSystem: "Android",
      applicationCategory: "SocialNetworkingApplication",
      inLanguage: "pt-BR",
      description:
        "App do bairro e do condomínio com vizinhos de endereço verificado: feed local, comunicados e reservas do síndico, alertas de segurança e mercado.",
      downloadUrl: "https://play.google.com/store/apps/details?id=com.meuvizinho.app",
      installUrl: "https://play.google.com/store/apps/details?id=com.meuvizinho.app",
      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
      publisher: { "@id": `${SITE_URL}/#org` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://meuvizinhoapp.com.br"
  ),
  title: {
    default: "Meu Vizinho: app do bairro e do condomínio",
    template: "%s | Meu Vizinho",
  },
  description:
    "App do bairro e do condomínio: feed com vizinhos de endereço verificado, comunicados e reservas do síndico, alertas de segurança e mercado local. Grátis, sem algoritmo e sem anúncio.",
  keywords: [
    "app de bairro",
    "app para condomínio",
    "app para síndico",
    "comunicados do condomínio",
    "reserva de salão de festas",
    "alerta de segurança no bairro",
    "vizinhos verificados",
    "grupo de WhatsApp do prédio",
  ],
  applicationName: "Meu Vizinho",
  authors: [{ name: "Meu Vizinho" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://meuvizinhoapp.com.br",
    siteName: "Meu Vizinho",
    title: "Meu Vizinho: seu bairro, conectado de verdade",
    description:
      "App do bairro e do condomínio: feed com vizinhos de endereço verificado, comunicados e reservas do síndico, alertas de segurança e mercado local. Grátis, sem algoritmo e sem anúncio.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Meu Vizinho: feed do bairro, condomínio e síndico, alertas e mercado, com vizinhos de endereço verificado",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meu Vizinho: seu bairro, conectado de verdade",
    description:
      "App do bairro e do condomínio: feed com vizinhos de endereço verificado, comunicados e reservas do síndico, alertas de segurança e mercado local. Grátis, sem algoritmo e sem anúncio.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Meu Vizinho',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${outfit.variable} h-full antialiased`}
    >
      <head>
        {apiOrigin && (
          <>
            <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={apiOrigin} />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col font-sans bg-bg text-fg">
        {/* Dados estruturados do app (Play Store) para busca. Sem nota/avaliação inventada. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
