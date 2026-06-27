"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";

interface PostPreview {
  id: number;
  content: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  author: {
    name: string;
    bairro: string;
    verified: boolean;
  };
}

export default function PostPreviewClient({ postId }: { postId: string }) {
  const [post, setPost] = useState<PostPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (postId === "preview") {
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const { data } = await api.get<PostPreview>(
          `/api/v1/posts/${postId}`
        );
        setPost(data);
      } catch {
        setError("Post nao encontrado");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="border-b-2 border-border px-6 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between animate-pulse">
            <div className="h-7 bg-muted rounded w-32" />
            <div className="h-9 bg-muted rounded-lg w-24" />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/6" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="h-4 bg-muted rounded w-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-danger font-semibold">
          {error ?? "Post nao encontrado"}
        </p>
        <Link
          href="/login/"
          className="text-primary font-semibold hover:underline"
        >
          Ir para BairroNow
        </Link>
      </div>
    );
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bairronow.com.br";
  const shareUrl = `${SITE_URL}/p/${post.id}`;

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b-2 border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/feed/" className="text-2xl font-extrabold text-primary">
            BairroNow
          </Link>
          {!isAuthenticated && (
            <div className="flex gap-2">
              <Link
                href="/login/"
                className="px-4 py-2 text-sm font-semibold text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register/"
                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <article className="bg-card border border-border/50 shadow-sm rounded-2xl p-6 space-y-4">
          <header className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
              {post.author.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-fg">{post.author.name}</p>
                {post.author.verified && (
                  <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full font-semibold">
                    Verificado
                  </span>
                )}
              </div>
              <p className="text-sm text-fg/60 font-medium">
                {post.author.bairro} •{" "}
                {new Date(post.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </header>

          <p className="text-fg leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          <footer className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-6 text-sm font-semibold text-fg/70">
              <span>{post.likeCount} curtidas</span>
              <span>{post.commentCount} comentarios</span>
            </div>
            <WhatsAppShareButton url={shareUrl} />
          </footer>
        </article>

        {!isAuthenticated && (
          <div className="mt-8 bg-primary/10 border-2 border-primary/30 rounded-lg p-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-fg">
              Entre no BairroNow para interagir com seus vizinhos
            </h2>
            <p className="text-sm text-fg/70">
              Curta, comente e compartilhe posts do seu bairro.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/login/"
                className="px-6 py-2 font-semibold text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register/"
                className="px-6 py-2 font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
