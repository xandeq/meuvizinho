import type { NotificationDto } from "@bairronow/shared-types";

// Texto e destino de cada notificação, usados pelo sino e pela página /notifications.
// Antes cada um tinha sua cópia, sem os tipos de condomínio (reserva, vínculo, comunicado):
// esses apareciam como "Fulano interagiu com você" e o link caía no feed.

export function notificationBody(n: NotificationDto): string {
  if (n.body) return n.body;
  const who = n.actor.displayName ?? "Alguém";
  switch (n.type) {
    case "like":              return `${who} curtiu seu post`;
    case "comment":           return `${who} comentou no seu post`;
    case "reply":             return `${who} respondeu seu comentário`;
    case "mention":           return `${who} mencionou você`;
    case "GroupJoinApproved": return "Sua entrada no grupo foi aprovada";
    case "NewRating":         return `${who} avaliou seu negócio`;
    case "GroupEvent":        return `${who} criou um evento no grupo`;
    case "listing_expired":   return "Seu anúncio expirou";
    case "price_drop":        return "Queda de preço em um anúncio favorito";
    case "security_alert":    return `${who} reportou uma ocorrência no bairro`;
    case "res_request":       return `${who} pediu vínculo com o condomínio`;
    case "res_reviewed":      return "Seu vínculo com o condomínio foi revisado";
    case "resv_pending":      return `${who} pediu uma reserva de área comum`;
    case "resv_reviewed":     return "Sua reserva de área comum foi revisada";
    case "annc_new":          return "Novo comunicado do condomínio";
    default:                  return `${who} interagiu com você`;
  }
}

export function notificationHref(n: NotificationDto): string {
  switch (n.type) {
    case "listing_expired":
    case "price_drop":
      return n.postId ? `/marketplace/${n.postId}/` : "/marketplace/";
    case "GroupJoinApproved":
    case "GroupEvent":
      return n.groupId ? `/groups/${n.groupId}/` : "/groups/";
    case "NewRating":
      return "/profile/";
    case "security_alert":
      // Não existe página por alerta; antes ia para /alertas/{id}/ (404).
      return "/alertas/";
    // Tipos de condomínio: postId carrega o id do condomínio (ver NotificationService).
    case "res_request":
      return n.postId ? `/condominios/${n.postId}/gerenciar/moradores/` : "/condominios/";
    case "res_reviewed":
      return n.postId ? `/condominios/${n.postId}/` : "/condominios/";
    case "resv_pending":
      return n.postId ? `/condominios/${n.postId}/gerenciar/reservas/` : "/condominios/";
    case "resv_reviewed":
      return n.postId ? `/condominios/${n.postId}/minhas-reservas/` : "/condominios/";
    case "annc_new":
      // postId = comunicado, groupId = condomínio.
      return n.groupId && n.postId
        ? `/condominios/${n.groupId}/comunicados/${n.postId}/`
        : "/condominios/";
    default:
      return n.postId ? `/feed/post/?id=${n.postId}` : "/feed/";
  }
}
