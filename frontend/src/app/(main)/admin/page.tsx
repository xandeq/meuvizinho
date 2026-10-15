"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /admin/ não tinha página: quem digitava o endereço caía no 404. Leva ao painel.
export default function AdminIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/dashboard/");
  }, [router]);
  return null;
}
