import type { AxiosInstance } from 'axios';
import { createFeedApi } from '../api/feed';

// Fotos no post: o compositor do app agora anexa até 4 imagens no mesmo multipart do texto.
describe('feedApi.create', () => {
  it('manda categoria, texto e cada foto como campo "images"', async () => {
    const post = jest.fn().mockResolvedValue({ data: { id: 1 } });
    const api = createFeedApi({ post } as unknown as AxiosInstance);

    await api.create(0, 'Pracinha ficou linda', [
      { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' },
      { uri: 'file:///b.jpg', name: 'b.jpg', type: 'image/jpeg' },
    ]);

    const fd = post.mock.calls[0][1] as FormData;
    expect(fd.getAll('category')).toEqual(['0']);
    expect(fd.getAll('body')).toEqual(['Pracinha ficou linda']);
    expect(fd.getAll('images')).toHaveLength(2);
  });

  it('sem fotos não manda o campo images', async () => {
    const post = jest.fn().mockResolvedValue({ data: { id: 1 } });
    await createFeedApi({ post } as unknown as AxiosInstance).create(1, 'Oi');
    expect((post.mock.calls[0][1] as FormData).getAll('images')).toHaveLength(0);
  });
});
