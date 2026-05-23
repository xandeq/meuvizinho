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
}

export default function AdminGroupsPage() {
  const user = useAuthStore((s) => s.user);
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.bairroId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api
      .get(`/api/v1/groups/flagged-posts?bairroId=${user.bairroId}`)
      .then((r) => setFlaggedPosts(r.data))
      .catch(() => setFlaggedPosts([]))
      .finally(() => setLoading(false));
  }, [user?.bairroId]);

  return (
    <main className="container mx-auto px-4 py-6 animate-slide-up">
      <h1 className="text-2xl font-semibold text-fg mb-6">Moderação de Grupos</h1>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border py-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-28" />
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-4 bg-muted rounded w-48" />
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {flaggedPosts.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.groupName}</td>
                <td className="py-2">{p.authorName}</td>
                <td className="py-2 max-w-xs truncate">{p.body}</td>
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
