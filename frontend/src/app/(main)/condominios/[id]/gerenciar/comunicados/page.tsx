import GerenciarComunicadosClient from './GerenciarComunicadosClient';

// Required for Next.js static export: must return at least one entry.
export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function GerenciarComunicadosPage() {
  return <GerenciarComunicadosClient />;
}
