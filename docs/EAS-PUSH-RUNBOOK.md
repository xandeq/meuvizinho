# EAS Push Notifications — Runbook (pendente desde Wave P)

Estado: **toda a infra já existe** — `usePushNotifications` registra o token via
`PUT /api/v1/push-token`, o backend envia via Expo push (dual-channel com SignalR),
e `eas.json` está configurado. O ÚNICO bloqueio é o `projectId`.

## O problema
`mobile/app.json` → `extra.eas.projectId = "meuvizinho"` é um **placeholder**.
O EAS exige um UUID real gerado no servidor da Expo; com o placeholder,
`getExpoPushTokenAsync({ projectId })` falha silenciosamente (best-effort catch).

## Passo interativo (você, 1x, ~2 min)
```bash
cd /d/claude-code/bairronow/mobile
npx eas-cli login          # conta Expo (criar em expo.dev se não tiver)
npx eas-cli init           # cria o projeto e grava o projectId UUID no app.json
```

## Depois (Claude pode fazer)
1. Conferir que `app.json` recebeu o `projectId` UUID real
2. Commit do app.json atualizado
3. Build interno: `npx eas-cli build --profile preview --platform android`
4. Instalar o APK num device físico → login → aceitar permissão de push
5. Testar: curtir um post de outro usuário → push deve chegar
6. (iOS depois: exige Apple Developer account US$99/ano — decisão separada)

## Verificação backend (já pronto, só conferir)
- `PUT /api/v1/push-token` grava o token no usuário
- `NotificationService` envia via `https://exp.host/--/api/v2/push/send`
