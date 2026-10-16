import type { Metadata } from "next";
import PostPreviewClient from "./PostPreviewClient";

export const metadata: Metadata = {
  title: "Meu Vizinho - Post do Bairro",
  openGraph: {
    title: "Meu Vizinho - Veja o que está acontecendo no bairro",
    description: "Conecte-se com seus vizinhos no Meu Vizinho.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export function generateStaticParams() {
  return [{ postId: "preview" }];
}

export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return <PostPreviewClient postId={postId} />;
}
