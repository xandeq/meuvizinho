jest.mock('react-native', () => ({ Share: { share: jest.fn() }, Linking: { canOpenURL: jest.fn(), openURL: jest.fn() } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
import { getListingShareUrl, getPostShareUrl } from '../utils/share';

// O domínio antigo (meuvizinho.com.br) não resolve: link compartilhado abria erro.
describe('links de compartilhamento', () => {
  it('apontam para o site no ar', () => {
    expect(getPostShareUrl('12')).toBe('https://meuvizinhoapp.com.br/p/12');
    expect(getListingShareUrl('4')).toBe('https://meuvizinhoapp.com.br/m/4');
  });
});
