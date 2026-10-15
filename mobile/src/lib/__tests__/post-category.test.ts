import { toCategory } from '../postCategory';

describe('toCategory', () => {
  it('aceita o nome que a API envia', () => {
    expect(toCategory('Dica')).toBe(0);
    expect(toCategory('Alerta')).toBe(1);
    expect(toCategory('Evento')).toBe(3);
  });
  it('aceita número e cai em Geral no desconhecido', () => {
    expect(toCategory(2)).toBe(2);
    expect(toCategory('xyz')).toBe(4);
    expect(toCategory(undefined)).toBe(4);
  });
});
