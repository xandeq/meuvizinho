import ComunicadoDetailClient from './ComunicadoDetailClient';

// Required for Next.js static export: must return at least one entry for every
// dynamic segment in the route (id AND announcementId).
export function generateStaticParams() {
  return [{ id: 'placeholder', announcementId: 'placeholder' }];
}

export default function ComunicadoDetailPage() {
  return <ComunicadoDetailClient />;
}
