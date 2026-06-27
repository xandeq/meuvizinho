'use client';
import { useEffect, useState } from 'react';
import { deleteGroupPost } from '@/lib/api/groups';
import { useAuthStore } from '@/lib/auth';
import api from '@/lib/api';

interface FlaggedPost {
  id: number;
  groupId: number;
  groupName: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export default function AdminGroupsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin === true;
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPost[]>([]);
  const [loading, setLoading] = useState(() => isAdmin && !!user?.bairroId);

  useEffect(() => {
    if (!isAdmin || !user?.bairroId) return;
    api
      .get(`/api/v1/groups/flagged-posts?bairroId=${user.bairroId}`)
      .then((r) => setFlaggedPosts(r.data as FlaggedPost[]))
      .catch(() => setFlaggedPosts([]))
      .finally(() => setLoading(false));
  }, [isAdmin, user?.bairroId]);

  if (!isAdmin) {
    return (
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-fg mb-4">Moderação de Grupos</h1>
        <p className="text-danger font-semibold text-sm">Acesso negado.</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 animate-slide-up">
      <h1 className="text-2xl font-semibold text-fg mb-6">Moderação de Grupos</h1>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border py-3">
              <div className="h-4 animate-shimmer rounded w-28" />
              <div className="h-4 animate-shimmer rounded w-20" />
              <div className="h-4 animate-shimmer rounded w-48" />
            </div>
          ))}
        </div>
      ) : !flaggedPosts.length ? (
        <p className="text-muted-fg text-sm">Nenhuma publicação sinalizada.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Grupo</th>
              <th className="text-left py-2">Autor</th>
              <th className="text-left py-2">Conteúdo</th>
              <th className="text-left py-2">Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flaggedPosts.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.groupName}</td>
                <td className="py-2">{p.authorName}</td>
                <td className="py-2 max-w-xs truncate">{p.body}</td>
                <td className="py-2 text-muted-fg whitespace-nowrap">
                  {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="py-2">
                  <button
                    onClick={() =>
                      deleteGroupPost(p.groupId, p.id).then(() =>
                        setFlaggedPosts((ps) => ps.filter((x) => x.id !== p.id))
                      )
                    }
                    className="text-danger hover:underline text-xs"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
