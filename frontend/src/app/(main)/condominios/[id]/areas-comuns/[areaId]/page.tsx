import AreaDetailClient from './AreaDetailClient';

// Required for Next.js static export: must return at least one entry for every
// dynamic segment in the route (id AND areaId).
export function generateStaticParams() {
  return [{ id: 'placeholder', areaId: 'placeholder' }];
}

export default function AreaDetailPage() {
  return <AreaDetailClient />;
}
