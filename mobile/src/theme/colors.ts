export const lightColors = {
  bg: '#F8FAFC',          // slate-50 (DESIGN.md: Névoa de Fundo)
  fg: '#0F172A',          // slate-900 (Ardósia Texto)
  mutedFg: '#64748B',     // slate-500 (Ardósia Suave)
  card: '#ffffff',        // Branco Cartão
  surfaceElevated: '#FAFBFF', // Névoa Elevada
  muted: '#F1F5F9',       // slate-100
  border: '#E2E8F0',      // slate-200 (Linha Névoa)
  borderStrong: '#CBD5E1', // slate-300 (Linha Névoa Forte)
  primary: '#2563EB',     // blue-600 — Azul Confiança (trust / action)
  primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF',
  secondary: '#059669',   // emerald-600 — Verde Verificação (reservado p/ confiança)
  secondaryHover: '#047857',
  secondaryLight: '#ECFDF5',
  accent: '#D97706',      // amber-600 — Âmbar Local (aligned with web token; was #F59E0B)
  accentHover: '#B45309',
  accentLight: '#FFFBEB',
  danger: '#DC2626',      // red-600
  dangerLight: '#FEF2F2',
  verified: '#059669',    // alias semântico — nunca usar fora de contexto de confiança
  verifiedGlow: '#ECFDF5',
  // Fundos sólidos com texto/ícone branco por cima (botão, FAB, hero, chip ativo).
  // Garantem contraste AA >= 4.5:1 com #FFF nos dois temas.
  primaryFill: '#2563EB',
  secondaryFill: '#047857',
  dangerFill: '#DC2626',
};

export const darkColors = {
  bg: '#0D1117',
  fg: '#F1F5F9',          // slate-100
  mutedFg: '#94A3B8',     // slate-400
  card: '#1E293B',        // slate-800
  surfaceElevated: '#1E293B',
  // Um degrau acima do card: igual ao card (#1E293B) as pílulas/caixas "muted" sumiam dentro de cards.
  muted: '#273449',
  border: '#334155',      // slate-700
  borderStrong: '#475569',
  primary: '#60A5FA',     // blue-400
  primaryHover: '#3B82F6',
  primaryLight: '#1E3A5F',
  secondary: '#34D399',   // emerald-400
  secondaryHover: '#10B981',
  secondaryLight: '#0F2922',
  accent: '#FBBF24',      // amber-400
  accentHover: '#F59E0B',
  accentLight: '#3A2E0F',
  danger: '#F87171',      // red-400
  dangerLight: '#3A1515',
  verified: '#34D399',
  verifiedGlow: '#0F2922',
  // No escuro, primary/secondary claros servem p/ texto e ícone; fundo sólido
  // com texto branco precisa do tom saturado (blue-400 + branco = 2.6:1, reprova AA).
  primaryFill: '#2563EB',
  secondaryFill: '#047857',
  dangerFill: '#DC2626',
};
