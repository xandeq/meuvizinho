import type { PostCategory } from './api/feed';

const CATEGORY_BY_NAME: Record<string, PostCategory> = { Dica: 0, Alerta: 1, Pergunta: 2, Evento: 3, Geral: 4 };

export function toCategory(c: PostCategory | string | null | undefined): PostCategory {
  if (typeof c === 'number' && c >= 0 && c <= 4) return c as PostCategory;
  if (typeof c === 'string') return CATEGORY_BY_NAME[c] ?? (/^[0-4]$/.test(c) ? (Number(c) as PostCategory) : 4);
  return 4;
}
