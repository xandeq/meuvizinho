import { Share, Linking } from 'react-native';

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
  return `https://meuvizinho.com.br/p/${postId}`;
}

export function getListingShareUrl(listingId: string) {
  return `https://meuvizinho.com.br/m/${listingId}`;
}
