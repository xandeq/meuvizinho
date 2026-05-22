import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import type { Author } from "@bairronow/shared-types";

export default function ProfileCard({ user }: { user: Author }) {
  return (
    <Card padding="none" variant="elevated" className="overflow-hidden">
      {/* Cover strip */}
      <div className="h-16 bg-gradient-to-r from-primary/20 via-secondary/15 to-primary/10" />

      {/* Avatar + info */}
      <div className="px-5 pb-5 -mt-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
          <div className="ring-4 ring-card rounded-full shadow-md shrink-0">
            <Avatar src={null} name={user.name} size="xl" verified={user.verified} />
          </div>
          <div className="flex-1 text-center sm:text-left sm:pb-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
              <h2 className="text-xl font-extrabold text-fg">{user.name}</h2>
              {user.verified && (
                <Badge variant="secondary">Verificado</Badge>
              )}
            </div>
            <p className="text-sm text-muted-fg font-medium">{user.bairro}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
