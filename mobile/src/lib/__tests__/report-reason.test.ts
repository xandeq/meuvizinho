jest.mock('../api', () => ({ apiClient: { post: jest.fn().mockResolvedValue({ data: {} }) } }));
import { apiClient } from '../api';
import { marketplaceApi } from '../api/marketplace';
import { ReportListingReason } from '../api/marketplace.types';

// O app mandava o número do próprio enum e o servidor lia outro: "golpe" chegava como "Ofensivo".
describe('marketplaceApi.report', () => {
  beforeEach(() => (apiClient.post as jest.Mock).mockClear());

  it('golpe vai como Other com o motivo no texto', async () => {
    await marketplaceApi.report(7, ReportListingReason.ScamSuspicion, 'pediu PIX antes');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/listings/7/report', {
      reason: 'Other',
      note: '[Suspeita de golpe / fraude] pediu PIX antes',
    });
  });

  it('descrição enganosa vai como Misinformation', async () => {
    await marketplaceApi.report(7, ReportListingReason.MisleadingDescription);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/listings/7/report', {
      reason: 'Misinformation',
      note: 'Descrição enganosa',
    });
  });
});
