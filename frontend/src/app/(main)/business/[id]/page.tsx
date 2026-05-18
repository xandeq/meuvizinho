import BusinessProfileClient from './BusinessProfileClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function BusinessProfilePage({ params }: { params: { id: string } }) {
  return <BusinessProfileClient userId={params.id} />;
}
