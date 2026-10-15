"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRouteId } from "@/lib/useRouteId";

export default function GroupEventsRedirectClient() {
  const router = useRouter();
  const groupId = useRouteId("groups", "groupId");

  useEffect(() => {
    if (groupId) router.replace(`/groups/${groupId}/`);
  }, [router, groupId]);

  return null;
}
