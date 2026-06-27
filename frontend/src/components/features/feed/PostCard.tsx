import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import type { Post } from "@bairronow/shared-types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function HeartIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function PostCard({ post }: { post: Post }) {
  return (
    <Card interactive ringOnHover padding="md" className="animate-slide-up">
      <header className="flex items-center gap-3 mb-3">
        <Avatar name={post.author.name} size="md" verified={post.author.verified} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-fg truncate">{post.author.name}</p>
          <p className="text-xs text-muted-fg font-medium">
            {post.author.bairro} · {timeAgo(post.createdAt)}
          </p>
        </div>
      </header>

      <p className="text-fg leading-relaxed mb-4 text-[15px]">{post.content}</p>

      <footer className="flex items-center gap-1 text-sm font-semibold text-muted-fg border-t border-border/50 pt-3 -mx-1">
        <button
          type="button"
          aria-label="Curtir"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-danger-light hover:text-danger transition-all duration-200 active:scale-95"
        >
          <HeartIcon />
          <span>{post.likeCount}</span>
        </button>
        <button
          type="button"
          aria-label="Comentarios"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-primary-light hover:text-primary transition-all duration-200 active:scale-95"
        >
          <CommentIcon />
          <span>{post.commentCount}</span>
        </button>
        <div className="ml-auto">
          <WhatsAppShareButton
            url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://bairronow.com.br"}/p/${post.id}`}
          />
        </div>
      </footer>
    </Card>
  );
}
