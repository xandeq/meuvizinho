// Build de teste contra a API local: MEUVIZINHO_API_URL=http://localhost:5000 + `adb reverse tcp:5000 tcp:5000`.
// Sem a variável (EAS, produção), vale o apiUrl do app.json.
module.exports = ({ config }) => ({
  ...config,
  extra: { ...config.extra, apiUrl: process.env.MEUVIZINHO_API_URL || config.extra?.apiUrl },
});
