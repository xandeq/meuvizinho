import { PASSWORD_RULES, passwordSchema, loginSchema } from '@bairronow/shared-validators';

// Mesmos casos de tests/BairroNow.Api.Tests/Validators/ResetPasswordRequestValidatorTests.cs:
// o app não pode aceitar uma senha que a API recusa (era o que acontecia no cadastro).
describe('regra de senha compartilhada', () => {
  it.each(['curta1!', 'semmaiuscula1!', 'SemNumero!!', 'SemSimbolo123'])('recusa %s como a API', (pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(false);
  });

  it('aceita senha forte', () => {
    expect(passwordSchema.safeParse('NovaSenha1!').success).toBe(true);
  });

  it('checklist bate com o schema', () => {
    for (const pw of ['', 'abc', 'Abcdefgh', 'Abcdefg1', 'Abcdef1!']) {
      const allOk = PASSWORD_RULES.every((r) => r.test(pw));
      expect(allOk).toBe(passwordSchema.safeParse(pw).success);
    }
  });

  it('login não reaplica a regra de força', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'curta' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});
