"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

/**
 * Export estático: /marketplace/4/ é servido pela página pré-gerada /marketplace/0/
 * (rewrite do .htaccess), e useParams() devolve "0". Anúncio, edição e conversa
 * abriam vazios ou como "Conversa inválida". Lê o id real da URL depois da hidratação.
 * Retorna null enquanto resolve e 0 se não houver id válido.
 */
export function useRouteId(prefix: string, paramName: string): number | null {
  const params = useParams<Record<string, string>>();
  const param = params?.[paramName];
  const [id, setId] = useState<number | null>(null);
  useEffect(() => {
    const m = window.location.pathname.match(new RegExp(`^/${prefix}/([0-9]+)`));
    const fromUrl = m ? Number(m[1]) : NaN;
    const fromParam = Number(param);
    // Sincroniza uma vez com a URL real (fonte externa); useSyncExternalStore ficava
    // preso no snapshot do servidor (null) e o id nunca resolvia.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setId(fromUrl > 0 ? fromUrl : fromParam > 0 ? fromParam : 0);
  }, [prefix, param]);
  return id;
}
