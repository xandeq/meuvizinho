import { Share, Linking } from 'react-native';
import Constants from 'expo-constants';

// meuvizinho.com.br não resolve (domínio não registrado): todo link compartilhado pelo app abria
// erro no WhatsApp de quem recebia. O site no ar é meuvizinhoapp.com.br.
const SITE_URL = ((Constants.expoConfig?.extra?.siteUrl as string | undefined) ?? 'https://meuvizinhoapp.com.br').replace(/\/$/, '');

export async function shareToWhatsApp(url: string, text: string) {
  const message = `${text}: ${url}`;
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

  const canOpen = await Linking.canOpenURL(whatsappUrl);
  if (canOpen) {
    await Linking.openURL(whatsappUrl);
  } else {
    // Fallback to system share sheet
    await Share.share({ message, url });
  }
}

export function getPostShareUrl(postId: string) {
  return `${SITE_URL}/p/${postId}`;
}

export function getListingShareUrl(listingId: string) {
  return `${SITE_URL}/m/${listingId}`;
}
